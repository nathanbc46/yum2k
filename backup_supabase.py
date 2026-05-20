"""
backup_supabase.py — ดึงข้อมูลผ่าน Supabase REST API แล้วบันทึกเป็น .sql
สามารถนำไฟล์ไปรันใน Supabase SQL Editor หรือ psql ได้โดยตรง
"""

import sys
import io
import json
import zipfile
import httpx
from datetime import datetime, timedelta
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# --- อ่าน config (env var สำหรับ GitHub Actions, config file สำหรับ local) ---
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY  = os.environ.get("SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    CONFIG_FILE = Path(__file__).parent / "backup_supabase.config.py"
    if not CONFIG_FILE.exists():
        print(f"ERROR: ไม่พบ {CONFIG_FILE} และไม่มี environment variables", file=sys.stderr)
        sys.exit(1)
    config: dict = {}
    exec(CONFIG_FILE.read_text(encoding="utf-8"), config)
    SUPABASE_URL = config["SUPABASE_URL"]
    SERVICE_KEY  = config["SERVICE_KEY"]
BACKUP_DIR     = Path(os.environ.get("BACKUP_DIR", Path(__file__).parent / "supabase_backups"))
RETENTION_DAYS = 7
PAGE_SIZE      = 1000

TABLES = [
    "categories",
    "products",
    "orders",
    "order_items",
    "expenses",
    "expense_categories",
    "stock_audit_logs",
    "daily_stock_snapshots",
]


def fetch_table(client: httpx.Client, table: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        resp = client.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={"select": "*", "limit": PAGE_SIZE, "offset": offset},
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def escape_sql_value(val) -> str:
    """แปลงค่าให้เป็น SQL literal"""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (dict, list)):
        # JSONB — แปลงเป็น JSON string แล้ว escape
        s = json.dumps(val, ensure_ascii=False)
        s = s.replace("'", "''")
        return f"'{s}'::jsonb"
    # string / datetime / etc.
    s = str(val).replace("'", "''")
    return f"'{s}'"


def rows_to_sql(table: str, rows: list[dict]) -> str:
    if not rows:
        return f"-- ตาราง {table}: ไม่มีข้อมูล\n"

    lines: list[str] = []
    lines.append(f"-- ========== {table} ({len(rows):,} rows) ==========")
    lines.append(f"TRUNCATE TABLE public.{table} RESTART IDENTITY CASCADE;")

    cols = list(rows[0].keys())
    col_list = ", ".join(f'"{c}"' for c in cols)

    # แบ่ง INSERT ทุก 500 rows เพื่อไม่ให้ statement ใหญ่เกินไป
    CHUNK = 500
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i:i + CHUNK]
        values_list = []
        for row in chunk:
            vals = ", ".join(escape_sql_value(row.get(c)) for c in cols)
            values_list.append(f"  ({vals})")
        lines.append(f"INSERT INTO public.{table} ({col_list}) VALUES")
        lines.append(",\n".join(values_list) + ";")

    lines.append("")
    return "\n".join(lines) + "\n"


def main():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = BACKUP_DIR / f"supabase_backup_{timestamp}.zip"

    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "count=none",
    }

    print(f"[{datetime.now():%H:%M:%S}] เริ่ม backup → {zip_path.name}")

    total_rows = 0
    failed: list[str] = []
    all_sql_parts: list[str] = []

    # header ของไฟล์ SQL
    all_sql_parts.append(
        f"-- Supabase Backup\n"
        f"-- วันที่: {datetime.now():%Y-%m-%d %H:%M:%S}\n"
        f"-- Project: {SUPABASE_URL}\n"
        f"-- วิธีใช้: นำไป run ใน Supabase SQL Editor หรือ psql\n"
        f"--\n"
        f"-- คำเตือน: TRUNCATE จะลบข้อมูลเดิมทั้งหมดก่อน INSERT\n\n"
        f"BEGIN;\n\n"
    )

    with httpx.Client(headers=headers, timeout=30) as client:
        for table in TABLES:
            try:
                rows = fetch_table(client, table)
                sql_block = rows_to_sql(table, rows)
                all_sql_parts.append(sql_block)
                total_rows += len(rows)
                print(f"  ✓ {table}: {len(rows):,} rows")
            except Exception as e:
                print(f"  ✗ {table}: {e}", file=sys.stderr)
                failed.append(table)

    all_sql_parts.append("COMMIT;\n")
    full_sql = "\n".join(all_sql_parts)

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # เขียน UTF-8 BOM ให้โปรแกรม text editor อ่านภาษาไทยได้
        sql_bytes = "﻿".encode("utf-8") + full_sql.encode("utf-8")
        zf.writestr(f"backup_{timestamp}.sql", sql_bytes)

        meta = {
            "backup_at": datetime.now().isoformat(),
            "tables": TABLES,
            "failed": failed,
            "total_rows": total_rows,
        }
        zf.writestr("_meta.json", json.dumps(meta, ensure_ascii=False, indent=2))

    size_kb = round(zip_path.stat().st_size / 1024, 1)
    print(f"\n[{datetime.now():%H:%M:%S}] สำเร็จ — {total_rows:,} rows | {size_kb} KB")
    if failed:
        print(f"  ⚠ ตารางที่ล้มเหลว: {', '.join(failed)}", file=sys.stderr)

    # ลบ backup เก่า
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    old_files = [f for f in BACKUP_DIR.glob("supabase_backup_*.zip")
                 if datetime.fromtimestamp(f.stat().st_mtime) < cutoff]
    for f in old_files:
        f.unlink()
    if old_files:
        print(f"[{datetime.now():%H:%M:%S}] ลบ backup เก่า {len(old_files)} ไฟล์")


if __name__ == "__main__":
    main()
