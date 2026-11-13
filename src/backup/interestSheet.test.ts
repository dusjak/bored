import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { sikkerhetskopiTrykk, setAnalyticsSink } from '../analytics/track.ts';
import {
  COMING_TAG,
  INTEREST_BODY,
  INTEREST_BUTTON,
  INTEREST_CAPTION,
  INTEREST_HEADER_LABEL,
  INTEREST_THANKS,
  NUDGE_BODY,
  NUDGE_ENABLE,
  NUDGE_LATER,
  NUDGE_TITLE,
} from './copy.ts';
import { COMING_TAG_GAP, COMING_TAG_PAD_X, COMING_TAG_PAD_Y, INTEREST_CAPTION_GAP, interestThanksColor, NUDGE_THANKS_MS } from './interest.ts';
import { themes } from '../theme/theme.ts';

describe('backup interest sheet', () => {
  it('is the duration sheet, with the honest copy and no list or email', () => {
    const root = process.cwd();
    const screen = readFileSync(join(root, 'src/components/backup/BackupInterestScreen.tsx'), 'utf8');
    const profile = readFileSync(join(root, 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    const log = readFileSync(join(root, 'src/app/(tabs)/log/index.tsx'), 'utf8');
    assert.equal(COMING_TAG, 'Kommer kanskje');
    assert.equal(INTEREST_HEADER_LABEL, 'Sikkerhetskopi, kommer kanskje');
    assert.equal(
      INTEREST_BODY,
      'Den finnes ikke ennå. I dag ligger alt bare på denne telefonen, og ingenting lagres andre steder.',
    );
    assert.equal(INTEREST_CAPTION, 'Trykket telles anonymt. Vi spør ikke om e-post.');
    assert.equal(INTEREST_BUTTON, 'Jeg vil ha det');
    assert.equal(INTEREST_THANKS, 'Takk, vi har notert det');
    assert.equal(COMING_TAG_PAD_X, 8);
    assert.equal(COMING_TAG_PAD_Y, 2);
    assert.equal(COMING_TAG_GAP, 8);
    assert.equal(INTEREST_CAPTION_GAP, 12);
    assert.match(screen, /<Sheet /);
    assert.match(screen, /ContentColumn/);
    assert.match(screen, /sheetContentPullUp/);
    assert.match(screen, /ComingTag variant="sheet"/);
    assert.match(screen, /alignItems: 'center'/);
    assert.match(screen, /size="comfort"/);
    assert.match(screen, /accessibilityState=\{\{ disabled: true \}\}/);
    assert.match(screen, /selectionAsync/);
    assert.match(screen, /motion\.fast/);
    assert.match(screen, /sikkerhetskopi_meld_interesse/);
    assert.doesNotMatch(screen, /setTimeout/);
    assert.doesNotMatch(screen, /onClose\(\)/);
    assert.doesNotMatch(screen, /Slik ser vi den for oss/);
    assert.doesNotMatch(screen, /Personvernerklæring|e-post@|TextInput/);
    assert.doesNotMatch(screen, /useWindowDimensions/);
    assert.match(profile, /<BackupInterestScreen/);
    assert.match(profile, /kilde="deg"/);
    assert.match(profile, /sikkerhetskopi_aapne/);
    assert.match(profile, /ComingTag variant="row"/);
    assert.doesNotMatch(profile, /router\.push\('\/profile\/backup'\)/);
    assert.match(log, /<BackupInterestScreen/);
    assert.match(log, /kilde="logg"/);
    assert.doesNotMatch(log, /router\.push\('\/log\/backup'\)/);
    assert.equal(NUDGE_TITLE, 'Alt ligger bare på denne telefonen');
    assert.equal(
      NUDGE_BODY,
      'Vi vurderer en kryptert sikkerhetskopi, men den finnes ikke ennå. Vil du ha den, kan du si fra.',
    );
    assert.equal(NUDGE_ENABLE, 'Jeg vil ha det');
    assert.equal(NUDGE_LATER, 'Ikke nå');
    assert.equal(NUDGE_THANKS_MS, 2000);
  });

  it('sends Knappetrykk with kilde and does not invent a second event name', () => {
    const seen: { name: string; kilde?: string; knapp?: string }[] = [];
    setAnalyticsSink((event) => {
      seen.push({ name: event.name, kilde: event.props.kilde, knapp: event.props.knapp });
    });
    const fromDeg = sikkerhetskopiTrykk({
      knapp: 'sikkerhetskopi_aapne',
      kilde: 'deg',
      skjerm: 'Deg',
      hendelse: 'åpner',
      navn: 'Sikkerhetskopi',
    });
    const fromLog = sikkerhetskopiTrykk({
      knapp: 'sikkerhetskopi_meld_interesse',
      kilde: 'logg',
      skjerm: 'sikkerhetskopi',
      hendelse: 'trykk',
      navn: INTEREST_BUTTON,
    });
    assert.equal(fromDeg.name, 'Knappetrykk');
    assert.equal(fromDeg.props.knapp, 'sikkerhetskopi_aapne');
    assert.equal(fromDeg.props.kilde, 'deg');
    assert.equal(fromLog.props.kilde, 'logg');
    assert.equal(JSON.stringify(fromLog.props).includes('@'), false);
    assert.deepEqual(seen.map((event) => event.kilde), ['deg', 'logg']);
  });

  it('paints the thanks line in accent on dark and sand.700 on light', () => {
    assert.equal(themes.dark.color.accent.default, '#C4B09A');
    assert.equal(themes.light.color.text.link, '#7D6650');
    assert.equal(
      interestThanksColor('dark', { accent: themes.dark.color.accent.default, link: themes.dark.color.text.link }),
      '#C4B09A',
    );
    assert.equal(
      interestThanksColor('light', { accent: themes.light.color.accent.default, link: themes.light.color.text.link }),
      '#7D6650',
    );
    assert.equal(themes.dark.color.text.secondary, '#ADA9A2');
    assert.equal(themes.light.color.text.secondary, '#55524D');
    assert.equal(themes.dark.color.button['tertiary-bg'], '#2B2A27');
    assert.equal(themes.light.color.button['tertiary-bg'], '#EAE6DF');
  });
});
