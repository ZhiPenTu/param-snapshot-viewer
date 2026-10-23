// 生成 1024x1024 应用图标源图（无第三方依赖的 PNG 编码），再交给 `npm run icons` 产出各平台图标。
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SIZE = 1024
const SS = 3
const W = SIZE * SS

const canvas = new Uint8Array(W * W * 4)

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= W) return
  const i = (y * W + x) * 4
  canvas[i] = r
  canvas[i + 1] = g
  canvas[i + 2] = b
  canvas[i + 3] = a
}

function roundedRect(x0, y0, x1, y1, radius, r, g, b, alpha = 255) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y += 1) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x += 1) {
      const dx = x < x0 + radius ? x0 + radius - x : (x > x1 - radius ? x - (x1 - radius) : 0)
      const dy = y < y0 + radius ? y0 + radius - y : (y > y1 - radius ? y - (y1 - radius) : 0)
      if (dx * dx + dy * dy <= radius * radius) setPixel(x, y, r, g, b, alpha)
    }
  }
}

function circle(cx, cy, radius, r, g, b) {
  for (let y = Math.floor(cy - radius); y < Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x < Math.ceil(cx + radius); x += 1) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radius * radius) setPixel(x, y, r, g, b, 255)
    }
  }
}

const s = (v) => Math.round(v * SS)

// 背景：圆角绿底（与系统参数窗口的信息条同色系）
roundedRect(s(56), s(56), s(968), s(968), s(190), 0x2f, 0x7d, 0x32)
// 白色面板
roundedRect(s(196), s(212), s(828), s(812), s(56), 255, 255, 255)
// 面板内的参数行
const rowY = [300, 404, 508, 612, 716]
rowY.forEach((y, index) => {
  circle(s(280), s(y + 14), s(20), 0x2f, 0x7d, 0x32)
  const width = index % 2 === 0 ? 420 : 340
  roundedRect(s(330), s(y), s(330 + width), s(y + 28), s(14), 0x4a, 0x5a, 0x6a)
})

// 3x 超采样降采样到 1024
const out = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let sy = 0; sy < SS; sy += 1) {
      for (let sx = 0; sx < SS; sx += 1) {
        const i = ((y * SS + sy) * W + (x * SS + sx)) * 4
        r += canvas[i]
        g += canvas[i + 1]
        b += canvas[i + 2]
        a += canvas[i + 3]
      }
    }
    const n = SS * SS
    const o = (y * SIZE + x) * 4
    out[o] = Math.round(r / n)
    out[o + 1] = Math.round(g / n)
    out[o + 2] = Math.round(b / n)
    out[o + 3] = Math.round(a / n)
  }
}

// PNG 编码
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
for (let y = 0; y < SIZE; y += 1) {
  raw[y * (SIZE * 4 + 1)] = 0
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8
ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const target = resolve(process.argv[2] || 'scripts/icon-source.png')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, png)
console.log(`wrote ${target} (${png.length} bytes)`)
