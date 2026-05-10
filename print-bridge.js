#!/usr/bin/env node
// =============================================================================
// print-bridge.js — Local Print Bridge สำหรับ Thermal Printer
// รันบนเครื่องที่ connect WiFi เดียวกับ printer แล้ว tablet ส่งคำสั่งพิมพ์มาที่นี่
//
// วิธีใช้:
//   node print-bridge.js
//
// จากนั้นไปตั้งค่าใน Admin → Settings → เครื่องพิมพ์:
//   เลือก "WiFi / Network" แล้วกรอก Bridge URL: http://[IP เครื่องนี้]:9200
// =============================================================================

import net  from 'node:net'
import http from 'node:http'
import os   from 'node:os'

const BRIDGE_PORT = 9201

// หา IP ของเครื่องนี้เพื่อแสดงให้ user ทราบ
function getLocalIPs() {
  const ifaces = os.networkInterfaces()
  const ips = []
  for (const iface of Object.values(ifaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
    }
  }
  return ips
}

const server = http.createServer((req, res) => {
  // CORS — อนุญาตทุก origin เพราะเป็น local network เท่านั้น
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    // GET / → แสดงสถานะ bridge (สำหรับ health check)
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'Yum2K Print Bridge' }))
      return
    }
    res.writeHead(405)
    res.end('Method Not Allowed')
    return
  }

  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    let body
    try {
      body = JSON.parse(Buffer.concat(chunks).toString())
    } catch {
      res.writeHead(400)
      res.end('Invalid JSON')
      return
    }

    const { ip, port, data } = body
    if (!ip || !data) {
      res.writeHead(400)
      res.end('Missing ip or data')
      return
    }

    const printerPort = port || 9100
    const buffer = Buffer.from(data, 'base64')

    console.log(`[${new Date().toLocaleTimeString('th-TH')}] พิมพ์ไปที่ ${ip}:${printerPort} (${buffer.length} bytes)`)

    const client = net.createConnection({ host: ip, port: printerPort }, () => {
      client.write(buffer, () => client.end())
    })

    client.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    })

    client.on('error', err => {
      console.error(`  ❌ TCP Error: ${err.message}`)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: err.message }))
    })

    setTimeout(() => {
      if (!client.destroyed) {
        client.destroy()
        res.writeHead(504, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'TCP timeout' }))
      }
    }, 5000)
  })
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${BRIDGE_PORT} ถูกใช้งานอยู่แล้ว`)
    console.error(`   รัน PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${BRIDGE_PORT}).OwningProcess -Force`)
    console.error(`   หรือเปลี่ยน BRIDGE_PORT ในไฟล์ print-bridge.js\n`)
  } else {
    console.error('❌ Server error:', err.message)
  }
  process.exit(1)
})

server.listen(BRIDGE_PORT, '0.0.0.0', () => {
  const ips = getLocalIPs()
  console.log('\n🖨️  Yum2K Print Bridge พร้อมใช้งาน')
  console.log('─'.repeat(45))
  console.log(`Port: ${BRIDGE_PORT}`)
  console.log('\nตั้งค่าใน Admin → Settings → เครื่องพิมพ์:')
  console.log('  วิธีการพิมพ์: WiFi / Network')
  console.log('  IP Printer:   10.10.100.25  (หรือ IP จริง)')
  console.log('  Bridge URL:   ใช้ IP เครื่องนี้ด้านล่าง\n')
  for (const ip of ips) {
    console.log(`  👉  http://${ip}:${BRIDGE_PORT}`)
  }
  console.log('\n─'.repeat(45))
  console.log('กด Ctrl+C เพื่อหยุด\n')
})
