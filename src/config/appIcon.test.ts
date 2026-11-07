import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

type Pixel = { r: number; g: number; b: number; a: number };

function paeth(left: number, up: number, upLeft: number) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function decodePng(file: URL): { width: number; height: number; colorType: number; at: (x: number, y: number) => Pixel } {
  const buf = readFileSync(file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  assert.ok(channels === 3 || channels === 4);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows: Buffer[] = [];
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const row = Buffer.alloc(stride);
    const prev = rows[y - 1];
    for (let i = 0; i < stride; i += 1) {
      const value = raw[cursor + i];
      const left = i >= channels ? row[i - channels] : 0;
      const up = prev ? prev[i] : 0;
      const upLeft = prev && i >= channels ? prev[i - channels] : 0;
      if (filter === 0) row[i] = value;
      else if (filter === 1) row[i] = (value + left) & 255;
      else if (filter === 2) row[i] = (value + up) & 255;
      else if (filter === 3) row[i] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[i] = (value + paeth(left, up, upLeft)) & 255;
      else assert.fail(`unknown png filter ${filter}`);
    }
    cursor += stride;
    rows.push(row);
  }
  return {
    width,
    height,
    colorType,
    at(x, y) {
      const row = rows[y];
      const i = x * channels;
      return {
        r: row[i],
        g: row[i + 1],
        b: row[i + 2],
        a: channels === 4 ? row[i + 3] : 255,
      };
    },
  };
}

describe('app icon v4', () => {
  it('points the top-level icon at the light file and wires iOS light, dark and tinted', () => {
    const app = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')) as {
      expo: { icon: string; ios: { icon: { light: string; dark: string; tinted: string } } };
    };
    assert.equal(app.expo.icon, './assets/icon/icon-1024.png');
    assert.deepEqual(app.expo.ios.icon, {
      light: './assets/icon/icon-1024.png',
      dark: './assets/icon/icon-1024-dark.png',
      tinted: './assets/icon/icon-1024-tinted.png',
    });
  });

  it('ships 1024 squares: opaque light, transparent dark, greyscale tinted, stone at p3-v2', () => {
    const root = new URL('../../assets/icon/', import.meta.url);
    const light = decodePng(new URL('icon-1024.png', root));
    const dark = decodePng(new URL('icon-1024-dark.png', root));
    const tinted = decodePng(new URL('icon-1024-tinted.png', root));
    for (const image of [light, dark, tinted]) {
      assert.equal(image.width, 1024);
      assert.equal(image.height, 1024);
    }
    assert.equal(light.colorType, 2);
    assert.equal(dark.colorType, 6);
    assert.equal(tinted.colorType, 2);

    const lightCorner = light.at(0, 0);
    assert.ok(lightCorner.r > 240 && lightCorner.g > 240 && lightCorner.b > 240);
    const lightStone = light.at(600, 610);
    assert.ok(lightStone.r < 40 && lightStone.g < 40 && lightStone.b < 40);

    const darkCorner = dark.at(0, 0);
    assert.equal(darkCorner.a, 0);
    const darkStone = dark.at(600, 610);
    assert.equal(darkStone.a, 255);
    assert.ok(darkStone.r < 40 && darkStone.g < 40 && darkStone.b < 40);

    const tintCorner = tinted.at(0, 0);
    assert.deepEqual([tintCorner.r, tintCorner.g, tintCorner.b], [0, 0, 0]);
    const tintStone = tinted.at(600, 610);
    assert.equal(tintStone.r, tintStone.g);
    assert.equal(tintStone.g, tintStone.b);
    assert.ok(tintStone.r > 100);
  });
});
