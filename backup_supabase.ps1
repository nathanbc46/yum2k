# ==========================================
# โหลด config จากไฟล์แยก (ไม่ commit รหัสผ่านเข้า git)
# ==========================================
$ConfigFile = Join-Path $PSScriptRoot "backup_supabase.config.ps1"
if (!(Test-Path $ConfigFile)) {
    Write-Error "ไม่พบไฟล์ config: $ConfigFile`nโปรดสร้างจาก backup_supabase.config.ps1.example"
    exit 1
}
. $ConfigFile

# ==========================================
# SETTINGS
# ==========================================
$PG_DUMP_PATH   = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$BACKUP_DIR     = "D:\yum2k\supabase_backups"
$RETENTION_DAYS = 7

# ==========================================
# PROCESS
# ==========================================
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$FILENAME  = "supabase_backup_$TIMESTAMP.dump"
$FULL_PATH = Join-Path $BACKUP_DIR $FILENAME

if (!(Test-Path -Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "[$(Get-Date)] เริ่ม backup Supabase..." -ForegroundColor Cyan

# ใช้ direct connection (port 5432) ไม่ใช่ pooler (port 6543) เพราะ pg_dump ไม่รองรับ PgBouncer
$env:PGPASSWORD = $DB_PASSWORD
try {
    & $PG_DUMP_PATH `
        -h "$REGION.pooler.supabase.com" `
        -p 6543 `
        -U "postgres.$PROJECT_ID" `
        -d "postgres" `
        -F c `
        -b `
        --no-acl `
        --no-owner `
        --no-prepared-statements `
        --no-password `
        -f $FULL_PATH

    if ($LASTEXITCODE -ne 0 -or !(Test-Path -Path $FULL_PATH)) {
        Write-Warning "[$(Get-Date)] ERROR: Backup ล้มเหลว (exit code: $LASTEXITCODE)"
        exit 1
    }

    $sizeMB = [math]::Round((Get-Item $FULL_PATH).Length / 1MB, 2)
    Write-Host "[$(Get-Date)] Backup สำเร็จ: $FULL_PATH ($sizeMB MB)" -ForegroundColor Green
} finally {
    # ลบ env var อย่างถูกต้องเพื่อไม่ให้รหัสผ่านค้างใน session
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# ลบ backup เก่าเกิน retention
Write-Host "[$(Get-Date)] ลบ backup เก่าเกิน $RETENTION_DAYS วัน..." -ForegroundColor Yellow
$LimitDate = (Get-Date).AddDays(-$RETENTION_DAYS)
Get-ChildItem -Path $BACKUP_DIR -Filter "supabase_backup_*.dump" |
    Where-Object { $_.LastWriteTime -lt $LimitDate } |
    Remove-Item -Force

Write-Host "[$(Get-Date)] เสร็จสิ้น" -ForegroundColor Green
