import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { themes } from '../theme/theme.ts';
import {
  FYLLING,
  FYLLING_DASH,
  FYLLING_FIELD,
  FYLLING_HALF_CLIP,
  FYLLING_ICON,
  FYLLING_STROKE,
  KLUMPEN_D,
  type FyllingName,
} from './fylling.ts';
import { QUESTIONS } from './mock.ts';

const NAMES: FyllingName[] = ['morgen', 'lunsj', 'kveld', 'varierer'];

describe('Fylling icons', () => {
  it('draws a 24 pt Klumpen in a 36 pt field with a 1.5 pt stroke', () => {
    assert.equal(FYLLING_FIELD, 36);
    assert.equal(FYLLING_ICON, 24);
    assert.equal(FYLLING_STROKE, 1.5);
    assert.equal(FYLLING_HALF_CLIP, 18);
    assert.equal(FYLLING_DASH, '2.16 1.92');
    assert.match(KLUMPEN_D, /^M 29\.9222 19\.6642 /);
    assert.match(KLUMPEN_D, /Z$/);
  });

  it('maps the four time-of-day options onto empty, half, full and dashed', () => {
    assert.deepEqual(FYLLING.morgen, { fill: 'none', dash: false });
    assert.deepEqual(FYLLING.lunsj, { fill: 'half', dash: false });
    assert.deepEqual(FYLLING.kveld, { fill: 'full', dash: false });
    assert.deepEqual(FYLLING.varierer, { fill: 'none', dash: true });
    assert.deepEqual(
      QUESTIONS.time.options.map((option) => option.icon),
      NAMES,
    );
    assert.equal(QUESTIONS.time.withIcons, true);
    assert.equal(QUESTIONS.time.title, 'Når passer det best?');
    const other = [QUESTIONS.distraction, QUESTIONS.state, QUESTIONS.goal, QUESTIONS.duration];
    assert.equal(other.every((question) => question.withIcons !== true), true);
    assert.equal(other.every((question) => question.options.every((option) => option.icon == null)), true);
  });

  it('drops the circle glyphs and the grey icon box', () => {
    const mock = readFileSync(new URL('./mock.ts', import.meta.url), 'utf8');
    assert.equal(/[○◑●◌]/.test(mock), false);
    const card = readFileSync(new URL('../components/OptionCard.tsx', import.meta.url), 'utf8');
    assert.equal(card.includes('FyllingIcon'), true);
    assert.equal(card.includes('iconBox'), false);
    assert.equal(card.includes('tertiary-bg'), false);
    assert.equal(card.includes("size={18}"), true);
    assert.equal(card.includes("theme.color.button['primary-bg']"), true);
    assert.equal(card.includes("theme.color.button['primary-text']"), true);
  });

  it('inverts the selected card: ink on light, paper on dark', () => {
    assert.equal(themes.light.color.button['primary-bg'], '#111110');
    assert.equal(themes.light.color.button['primary-text'], '#F8F6F2');
    assert.equal(themes.dark.color.button['primary-bg'], '#F8F6F2');
    assert.equal(themes.dark.color.button['primary-text'], '#111110');
    assert.equal(themes.light.color.text.primary, '#111110');
    assert.equal(themes.dark.color.text.primary, '#F8F6F2');
    assert.equal(themes.light.radius.medium, 8);
    assert.equal(themes.light.text.label.fontSize, 15);
    assert.equal(themes.light.text.label.lineHeight, 20);
    assert.equal(themes.light.text.caption.fontSize, 13);
    assert.equal(themes.light.text.caption.lineHeight, 18);
  });
});
