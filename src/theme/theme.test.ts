import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  DEFAULT_THEME_PREFERENCE,
  fonts,
  monoHeroFontLineHeight,
  resolveThemeName,
  screenPadding,
  space,
  tabularNums,
  text,
  themes,
} from './theme.ts';

describe('theme tokens', () => {
  it('maps destructive text to red 700 in light and red 200 in dark', () => {
    assert.equal(themes.light.color.text.destructive, '#9F2D2D');
    assert.equal(themes.dark.color.text.destructive, '#FFB4AB');
  });

  it('uses a 24pt screen margin and Automatisk as the default theme', () => {
    assert.equal(space['4'], 16);
    assert.equal(space['6'], 24);
    assert.equal(space['7'], 28);
    assert.equal(space['10'], 40);
    assert.equal(space['12'], 48);
    assert.equal(space['32'], 128);
    assert.equal(screenPadding, space['6']);
    assert.equal(text.headline.lineHeight, 32);
    assert.equal(text.monoHero.fontSize, 56);
    assert.equal(text.monoHero.lineHeight, 56);
    // Figtree Light typo box at 56pt: ceil(56 × 1200 / 1000) = 68.
    assert.equal(monoHeroFontLineHeight, 68);
    assert.ok(monoHeroFontLineHeight > Number(text.monoHero.lineHeight));
    assert.equal(DEFAULT_THEME_PREFERENCE, 'system');
    assert.equal(resolveThemeName('system', 'dark'), 'dark');
    assert.equal(resolveThemeName('system', 'light'), 'light');
    assert.equal(resolveThemeName('system', null), 'light');
  });
});

describe('system F type scale', () => {
  const faces = [
    'DMSerifDisplay_400Regular',
    'DMSerifDisplay_400Regular_Italic',
    'Figtree_300Light',
    'Figtree_400Regular',
    'Figtree_500Medium',
    'Figtree_600SemiBold',
  ];

  it('registers only the system F faces, and every role uses one of them', () => {
    const registry = readFileSync(join(process.cwd(), 'src/theme/fonts.ts'), 'utf8');
    for (const face of faces) {
      assert.ok(registry.includes(face), face);
    }
    assert.equal(registry.includes('300Light_Italic'), false);
    const loaded = new Set(Object.values(fonts));
    for (const face of faces) assert.ok(loaded.has(face as (typeof fonts)[keyof typeof fonts]), face);
    for (const style of Object.values(text)) {
      assert.ok(loaded.has(style.fontFamily as (typeof fonts)[keyof typeof fonts]), String(style.fontFamily));
    }
  });

  it('sets body to Figtree Regular and keeps Light off prose', () => {
    assert.equal(fonts.sans, 'Figtree_400Regular');
    assert.equal(fonts.sansLight, 'Figtree_300Light');
    assert.equal(text.body.fontFamily, fonts.sans);
    assert.equal(text.body.fontSize, 16);
    assert.equal(text.body.lineHeight, 24);
    assert.equal(text.body.fontWeight, undefined);
    assert.equal(text.bodySmall.fontFamily, fonts.sans);
    assert.equal(text.bodyLarge.fontFamily, fonts.sans);
    assert.equal(text.caption.fontFamily, fonts.sans);
    const lightRoles = new Set(['monoTimer', 'monoHero']);
    for (const [name, style] of Object.entries(text)) {
      if (style.fontFamily === fonts.sansLight) assert.ok(lightRoles.has(name), name);
    }
  });

  it('maps the system F roles', () => {
    assert.equal(fonts.sansMedium, 'Figtree_500Medium');
    assert.equal(text.label.fontFamily, fonts.sansMedium);
    assert.equal(text.label.fontSize, 15);
    assert.equal(text.labelSmall.fontFamily, fonts.sansMedium);
    assert.equal(text.labelSmall.fontSize, 14);
    assert.equal(text.button.fontFamily, fonts.sansMedium);
    assert.equal(text.button.fontSize, 16);
    assert.equal(text.eyebrow.fontFamily, fonts.sansMedium);
    assert.equal(text.tab.fontFamily, fonts.sansMedium);
    assert.equal(text.tab.fontSize, 10);
    assert.equal(text.tab.lineHeight, 12);

    assert.equal(text.display.fontFamily, fonts.serifItalic);
    assert.equal(text.display.fontSize, 30);
    assert.equal(text.display.lineHeight, 34);
    assert.equal(text.display.letterSpacing, -0.6);
    assert.equal(text.headline.fontFamily, fonts.serifItalic);
    assert.equal(text.note.fontFamily, fonts.serifItalic);
    assert.equal(text.note.fontSize, 15);
    assert.equal(text.note.lineHeight, 20);

    assert.equal(text.monoTimer.fontFamily, fonts.sansLight);
    assert.equal(text.monoTimer.fontSize, 88);
    assert.equal(text.monoTimer.lineHeight, 96);
    assert.equal(text.monoHero.fontFamily, fonts.sansLight);
    assert.equal(text.monoData.fontFamily, fonts.sansMedium);
    assert.equal(text.monoData.fontSize, 15);
    assert.equal(text.monoMeta.fontFamily, fonts.sans);
    assert.equal(text.monoMeta.fontSize, 13);
  });

  it('puts tabular-nums on number roles only', () => {
    for (const name of ['monoTimer', 'monoHero', 'monoData', 'monoMeta'] as const) {
      assert.equal(text[name].fontVariant, tabularNums, name);
    }
    for (const name of [
      'display',
      'headline',
      'body',
      'bodyLarge',
      'bodySmall',
      'label',
      'labelSmall',
      'button',
      'eyebrow',
      'caption',
      'tab',
      'note',
    ] as const) {
      assert.equal(text[name].fontVariant, undefined, name);
    }
  });

  it('does not mention the retired sans or mono families outside tests', () => {
    const retired = ['DMSans', 'DMMono', 'dm-sans', 'dm-mono', 'DM Sans', 'DM Mono'];
    const hits: string[] = [];
    for (const file of sourceFiles(process.cwd())) {
      const source = readFileSync(file, 'utf8');
      for (const needle of retired) {
        if (source.includes(needle)) hits.push(`${file} ${needle}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
      continue;
    }
    if (entry.endsWith('.test.ts')) continue;
    if (/\.(ts|tsx|js|json|md)$/.test(entry)) out.push(path);
  }
  return out;
}
