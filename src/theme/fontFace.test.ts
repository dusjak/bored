import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { fonts, text } from './theme.ts';

function table(buf: Buffer, tag: string): number {
  const count = buf.readUInt16BE(4);
  for (let i = 0; i < count; i += 1) {
    const offset = 12 + i * 16;
    if (buf.toString('latin1', offset, offset + 4) === tag) return buf.readUInt32BE(offset + 8);
  }
  throw new Error(tag);
}

function face(file: string) {
  const buf = readFileSync(file);
  const os2 = table(buf, 'OS/2');
  const head = table(buf, 'head');
  const post = table(buf, 'post');
  const name = table(buf, 'name');
  const count = buf.readUInt16BE(name + 2);
  const stringOffset = buf.readUInt16BE(name + 4);
  let ps = '';
  for (let i = 0; i < count; i += 1) {
    const record = name + 6 + i * 12;
    if (buf.readUInt16BE(record) !== 3 || buf.readUInt16BE(record + 6) !== 6 || ps) continue;
    const length = buf.readUInt16BE(record + 8);
    const start = name + stringOffset + buf.readUInt16BE(record + 10);
    ps = Array.from({ length: length / 2 }, (_, n) => String.fromCharCode(buf.readUInt16BE(start + n * 2))).join('');
  }
  return {
    ps,
    italic: (buf.readUInt16BE(os2 + 62) & 1) === 1,
    angle: buf.readInt32BE(post + 4) / 65536,
    macItalic: (buf.readUInt16BE(head + 44) & 2) === 2,
  };
}

describe('upright serif titles', () => {
  it('maps titles to the regular file and keeps Logg notes on the italic file', () => {
    const root = join(process.cwd(), 'node_modules/@expo-google-fonts/dm-serif-display');
    const regular = face(join(root, '400Regular/DMSerifDisplay_400Regular.ttf'));
    const italic = face(join(root, '400Regular_Italic/DMSerifDisplay_400Regular_Italic.ttf'));
    assert.equal(fonts.serif, 'DMSerifDisplay_400Regular');
    assert.equal(fonts.serifItalic, 'DMSerifDisplay_400Regular_Italic');
    assert.equal(regular.ps, 'DMSerifDisplay-Regular');
    assert.equal(regular.italic, false);
    assert.equal(regular.angle, 0);
    assert.equal(regular.macItalic, false);
    assert.equal(italic.ps, 'DMSerifDisplay-Italic');
    assert.equal(italic.italic, true);
    assert.equal(italic.angle, -12);
    assert.equal(text.display.fontFamily, fonts.serif);
    assert.equal(text.headline.fontFamily, fonts.serif);
    assert.equal(text.note.fontFamily, fonts.serifItalic);
    const title = readFileSync(join(process.cwd(), 'src/components/ScreenTitle.tsx'), 'utf8');
    assert.match(title, /screenTitleFamily\(theme\.fonts\.serif\)/);
    assert.doesNotMatch(title, /serifItalic/);
    const log = readFileSync(join(process.cwd(), 'src/app/(tabs)/log/index.tsx'), 'utf8');
    assert.match(log, /theme\.text\.note/);
  });
});
