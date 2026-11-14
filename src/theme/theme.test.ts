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

/** Relative luminance contrast, WCAG 2.x. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const channel = (pair: string) => {
      const value = parseInt(pair, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const r = channel(h.slice(0, 2));
    const g = channel(h.slice(2, 4));
    const b = channel(h.slice(4, 6));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
}

describe('theme tokens', () => {
  it('maps destructive text to red 700 in light and red 200 in dark', () => {
    assert.equal(themes.light.color.text.destructive, '#9F2D2D');
    assert.equal(themes.dark.color.text.destructive, '#FFB4AB');
  });

  it('uses object black for the light fill and leaves the dark fill', () => {
    assert.equal(themes.light.color.object.fill, '#111110');
    assert.equal(themes.dark.color.object.fill, '#1A1A18');
    assert.equal(themes.light.color.ink.default, '#111110');
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
    assert.equal(themes.light.color.glow.core, '#F6EBD6');
    assert.equal(themes.light.color.glow.amber, '#E8C98E');
    assert.equal(themes.light.color.glow.matte, '#D8CCB6');
    assert.equal(themes.dark.color.glow.core, themes.light.color.glow.core);
    assert.equal(themes.dark.color.glow.amber, themes.light.color.glow.amber);
    assert.equal(themes.dark.color.glow.matte, themes.light.color.glow.matte);
    assert.equal(DEFAULT_THEME_PREFERENCE, 'system');
    assert.equal(resolveThemeName('system', 'dark'), 'dark');
    assert.equal(resolveThemeName('system', 'light'), 'light');
    assert.equal(resolveThemeName('system', null), 'light');
  });

  it('shares the BD-1 glow colours in both themes', () => {
    for (const theme of [themes.light, themes.dark]) {
      assert.equal(theme.color.glow.core, '#F6EBD6');
      assert.equal(theme.color.glow.amber, '#E8C98E');
      assert.equal(theme.color.glow.highlight, 'rgba(255,255,255,0.35)');
      assert.equal(theme.color.glow.solid, '#F8F6F2');
      assert.equal(theme.color.glow.matte, '#D8CCB6');
    }
    assert.equal(themes.dark.color.session['ring-track'], '#66635D');
    assert.equal(themes.light.color.session['ring-track'], '#8A8781');
  });

  it('gives Deg a sand link that stays above 4.5:1 in the light', () => {
    assert.equal(themes.light.color.text.link, '#7D6650');
    assert.equal(themes.dark.color.text.link, '#C4B09A');
    assert.ok(contrast(themes.light.color.text.link, themes.light.color.bg.grouped) >= 4.5);
    assert.ok(contrast(themes.light.color.text.link, themes.light.color.bg.default) >= 4.5);
    assert.ok(contrast(themes.dark.color.text.link, themes.dark.color.bg.grouped) >= 4.5);
  });

  it('puts a 1pt border on the off switch so the control clears 3:1', () => {
    assert.ok(contrast(themes.dark.color.control.off, themes.dark.color.surface.grouped) < 3);
    assert.ok(contrast(themes.light.color.control.off, themes.light.color.surface.grouped) < 3);
    assert.ok(contrast(themes.dark.color.control.offBorder, themes.dark.color.surface.grouped) >= 3);
    assert.ok(contrast(themes.light.color.control.offBorder, themes.light.color.surface.grouped) >= 3);
    assert.ok(contrast(themes.light.color.control.offBorder, themes.light.color.bg.default) >= 3);
    assert.equal(themes.light.color.bg.overlay, 'rgba(17,17,16,0.4)');
    assert.equal(themes.dark.color.bg.overlay, 'rgba(17,17,16,0.4)');
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

    assert.equal(text.display.fontFamily, fonts.serif);
    assert.equal(text.display.fontSize, 30);
    assert.equal(text.display.lineHeight, 34);
    assert.equal(text.display.letterSpacing, -0.6);
    assert.equal(text.headline.fontFamily, fonts.serif);
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
