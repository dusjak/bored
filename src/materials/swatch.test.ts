import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { VISIBLE_MATERIALS, textureChoice } from '../onboarding/flow.ts';

function readPng(path: string): { width: number; height: number; color: number; pixels: Buffer } {
  const data = readFileSync(path);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let offset = 8;
  let width = 0;
  let height = 0;
  let color = 0;
  const idat: Buffer[] = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString('ascii');
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      color = chunk[9];
    } else if (type === 'IDAT') idat.push(chunk);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[source];
    source += 1;
    const row = y * stride;
    for (let i = 0; i < stride; i += 1) {
      const value = raw[source];
      source += 1;
      const left = i >= 4 ? pixels[row + i - 4] : 0;
      const up = y > 0 ? pixels[row - stride + i] : 0;
      const upLeft = y > 0 && i >= 4 ? pixels[row - stride + i - 4] : 0;
      let next = value;
      if (filter === 1) next = (value + left) & 255;
      else if (filter === 2) next = (value + up) & 255;
      else if (filter === 3) next = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const pa = Math.abs(estimate - left);
        const pb = Math.abs(estimate - up);
        const pc = Math.abs(estimate - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        next = (value + predictor) & 255;
      }
      pixels[row + i] = next;
    }
  }
  return { width, height, color, pixels };
}

function pixel(png: { width: number; pixels: Buffer }, x: number, y: number): number[] {
  const index = (y * png.width + x) * 4;
  return [png.pixels[index], png.pixels[index + 1], png.pixels[index + 2], png.pixels[index + 3]];
}

describe('texture swatches', () => {
  it('keeps three still crops and does not mount a live chip', () => {
    const root = process.cwd();
    const tekstur = readFileSync(join(root, 'src/app/onboarding/tekstur.tsx'), 'utf8');
    const swatch = readFileSync(join(root, 'src/components/MaterialSwatch.tsx'), 'utf8');
    assert.deepEqual(VISIBLE_MATERIALS, ['gummi', 'skifer', 'floyel']);
    assert.match(tekstur, /Redirect href="\/onboarding\/kjedomhet"/);
    assert.doesNotMatch(tekstur, /LiveKlump|MaterialSwatch|VISIBLE_MATERIALS/);
    assert.doesNotMatch(swatch, /kull\.png|emalje\.png|useLiveMaterial|readPixels|<Canvas/);

    const centers: string[] = [];
    for (const id of VISIBLE_MATERIALS) {
      const path = join(root, 'assets/materials/swatches', `${id}.png`);
      const png = readPng(path);
      assert.equal(png.width, 132);
      assert.equal(png.height, 132);
      assert.equal(png.color, 6);
      assert.ok(readFileSync(path).length < 40_000);
      const corner = pixel(png, 0, 0);
      const center = pixel(png, 66, 66);
      assert.equal(corner[3], 0);
      assert.equal(center[3], 255);
      assert.ok(center[0] + center[1] + center[2] > 0);
      centers.push(center.join(','));
    }
    assert.equal(new Set(centers).size, 3);
    assert.equal(existsSync(join(root, 'assets/materials/swatches/kull.png')), false);
    assert.equal(existsSync(join(root, 'assets/materials/swatches/emalje.png')), false);
  });

  it('leaves a stored Kull or Plast id in place and selects Gummi only when unset', () => {
    assert.deepEqual(textureChoice(undefined), { material: 'gummi', chip: 'gummi' });
    assert.deepEqual(textureChoice('skifer'), { material: 'skifer', chip: 'skifer' });
    assert.deepEqual(textureChoice('floyel'), { material: 'floyel', chip: 'floyel' });
    assert.deepEqual(textureChoice('kull'), { material: 'kull', chip: null });
    assert.deepEqual(textureChoice('emalje'), { material: 'emalje', chip: null });
  });
});
