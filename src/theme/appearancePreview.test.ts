import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activeAppearance,
  commitAppearance,
  persistedAppearance,
  phoneScheme,
  previewAppearance,
  rememberPhoneScheme,
  resolvedThemeName,
  revertAppearance,
  type AppearanceState,
} from './appearancePreview.ts';

const savedSystem: AppearanceState = { saved: 'system', preview: null };

describe('appearance preview', () => {
  it('opens on the saved preference, which defaults to Automatisk', () => {
    assert.equal(activeAppearance(savedSystem), 'system');
    assert.equal(persistedAppearance(savedSystem), 'system');
  });

  it('previews a tap without persisting it', () => {
    const dark = previewAppearance(savedSystem, 'dark');
    assert.equal(activeAppearance(dark), 'dark');
    assert.equal(persistedAppearance(dark), 'system');

    const light = previewAppearance(dark, 'light');
    assert.equal(activeAppearance(light), 'light');
    assert.equal(persistedAppearance(light), 'system');

    const auto = previewAppearance(light, 'system');
    assert.equal(activeAppearance(auto), 'system');
    assert.equal(persistedAppearance(auto), 'system');
  });

  it('reverts to the saved preference and leaves storage alone', () => {
    const previewing = previewAppearance({ saved: 'light', preview: null }, 'dark');
    const reverted = revertAppearance(previewing);
    assert.deepEqual(reverted, { saved: 'light', preview: null });
    assert.equal(persistedAppearance(reverted), 'light');
  });

  it('saves only when the choice is committed', () => {
    const previewing = previewAppearance(savedSystem, 'dark');
    const saved = commitAppearance(previewing);
    assert.deepEqual(saved, { saved: 'dark', preview: null });
    assert.equal(persistedAppearance(saved), 'dark');
    assert.equal(activeAppearance(saved), 'dark');
  });

  it('commits the saved value when nothing is being previewed', () => {
    assert.deepEqual(commitAppearance({ saved: 'light', preview: null }), {
      saved: 'light',
      preview: null,
    });
  });

  it('keeps the check on the preview and on the saved value before a tap', () => {
    assert.equal(activeAppearance(savedSystem), 'system');
    assert.equal(activeAppearance(previewAppearance(savedSystem, 'light')), 'light');
    assert.equal(activeAppearance(previewAppearance({ saved: 'dark', preview: null }, 'system')), 'system');
  });

  it('does not treat a killed preview as the next launch', () => {
    const killed = previewAppearance({ saved: 'dark', preview: null }, 'light');
    assert.equal(persistedAppearance(killed), 'dark');
    assert.deepEqual(revertAppearance(killed).saved, 'dark');
  });
});

describe('appearance revert does not flash the forced scheme', () => {
  it('remembers the phone scheme only while Automatisk is actually applied', () => {
    assert.equal(rememberPhoneScheme('system', 'dark', null), 'dark');
    assert.equal(rememberPhoneScheme('system', null, 'light'), 'light');
    assert.equal(rememberPhoneScheme('dark', 'dark', 'light'), 'light');
  });

  it('uses the remembered phone scheme while useColorScheme still echoes the preview', () => {
    assert.equal(phoneScheme({ applied: 'dark', reported: 'dark', remembered: 'light' }), 'light');
    assert.equal(phoneScheme({ applied: 'system', reported: 'dark', remembered: 'light' }), 'dark');
  });

  it('paints Automatisk from the phone on the revert frame, not the preview', () => {
    const reverted = revertAppearance(previewAppearance(savedSystem, 'dark'));
    const resolved = resolvedThemeName(reverted, 'dark', 'dark', 'light');
    assert.equal(resolved.name, 'light');
    assert.equal(resolved.remembered, 'light');
  });

  it('follows the phone while Automatisk is the applied preference', () => {
    const resolved = resolvedThemeName(savedSystem, 'system', 'dark', 'light');
    assert.equal(resolved.name, 'dark');
    assert.equal(resolved.remembered, 'dark');
  });

  it('paints an explicit preview immediately, whatever the phone is doing', () => {
    const previewing = previewAppearance(savedSystem, 'dark');
    assert.equal(resolvedThemeName(previewing, 'system', 'light', 'light').name, 'dark');
    const back = previewAppearance(previewing, 'light');
    assert.equal(resolvedThemeName(back, 'dark', 'dark', 'dark').name, 'light');
  });
});
