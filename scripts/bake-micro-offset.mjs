/**
 * One-shot bake of the rest micro-offset. Not used by the app at runtime.
 * Run: node --experimental-strip-types scripts/bake-micro-offset.mjs
 */
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

import { MATERIAL_IDS } from '../src/materials/pathLight.ts';
import { SOURCE_MASTER, restMicroOffset } from '../src/materials/sourceParity.ts';

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function pngRG(width, height, rg) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const s = y * width + x;
      const d = row + 1 + x * 4;
      raw[d] = rg[s * 2];
      raw[d + 1] = rg[s * 2 + 1];
      raw[d + 2] = 0;
      raw[d + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function pack(values, half) {
  const out = new Uint8Array(values.length * 2);
  let clipped = 0;
  for (let i = 0; i < values.length; i += 1) {
    let u = (values[i] / half + 1) / 2;
    if (u < 0 || u > 1) clipped += 1;
    u = Math.min(1, Math.max(0, u));
    const q = Math.round(u * 65535);
    out[i * 2] = (q >> 8) & 255;
    out[i * 2 + 1] = q & 255;
  }
  return { bytes: out, clipped };
}

const root = join(process.cwd(), 'assets/materials/2026-11-07');
const packInfo = {};
for (const id of MATERIAL_IDS) {
  const t0 = Date.now();
  const field = restMicroOffset(id);
  let max = 0;
  for (let i = 0; i < field.x.length; i += 1) {
    max = Math.max(max, Math.abs(field.x[i]), Math.abs(field.y[i]));
  }
  const half = Math.max(max, 1e-6);
  const dir = join(root, id);
  mkdirSync(dir, { recursive: true });
  const px = pack(field.x, half);
  const py = pack(field.y, half);
  const xPng = pngRG(SOURCE_MASTER, SOURCE_MASTER, px.bytes);
  const yPng = pngRG(SOURCE_MASTER, SOURCE_MASTER, py.bytes);
  writeFileSync(join(dir, 'micro-x.png'), xPng);
  writeFileSync(join(dir, 'micro-y.png'), yPng);
  packInfo[id] = {
    half,
    clipped: px.clipped + py.clipped,
    xSha256: createHash('sha256').update(xPng).digest('hex'),
    ySha256: createHash('sha256').update(yPng).digest('hex'),
    ms: Date.now() - t0,
  };
  console.log(JSON.stringify({ id, ...packInfo[id] }));
}
writeFileSync(join(process.cwd(), 'src/materials/microPack.json'), `${JSON.stringify(packInfo, null, 2)}\n`);
console.log('BAKE_DONE');
