import { useEffect, useState, type RefObject } from 'react';
import { StyleSheet, Text, type HostInstance } from 'react-native';

import { knappetrykk } from '@/analytics/track';
import { Button } from '@/components/Button';
import { ContentColumn } from '@/components/ContentColumn';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Sheet } from '@/components/Sheet';
import { getSetting, setSetting } from '@/data/repository';
import { sheetContentPullUp } from '@/sheet/motion';
import { useTheme } from '@/theme';

const NOTED_KEY = 'backup.interestNoted';
/** Placeholder until design replaces the confirmation line. */
const THANKS = 'Takk, notert';
export const BACKUP_INTEREST_LABEL = 'Jeg vil ha en sikkerhetskopi';

const BODY =
  'I dag ligger alt bare på denne telefonen. Ingenting lagres andre steder. Vi vurderer en kryptert sikkerhetskopi, men vet ikke om behovet er der.';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Focus returns to the Deg row that opened the sheet. */
  returnFocusRef?: RefObject<HostInstance | null>;
};

/**
 * Variant A as the same sheet as «Velg varighet»: dimmed ground, grabber,
 * and a downward swipe that closes. Deg opens it. It is not a pushed screen.
 */
export function BackupInterestScreen({ visible, onClose, returnFocusRef }: Props) {
  const { theme } = useTheme();
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    knappetrykk({ type: 'Knapp', navn: 'Sikkerhetskopi', hendelse: 'åpner', skjerm: 'sikkerhetskopi' });
    let live = true;
    void getSetting(NOTED_KEY).then((value) => {
      if (live && value === '1') setNoted(true);
    });
    return () => {
      live = false;
    };
  }, [visible]);

  const interest = () => {
    if (noted) return;
    setNoted(true);
    void setSetting(NOTED_KEY, '1');
    knappetrykk({ type: 'Knapp', navn: BACKUP_INTEREST_LABEL, hendelse: 'trykk', skjerm: 'sikkerhetskopi' });
  };

  return (
    <Sheet visible={visible} onClose={onClose} returnFocusRef={returnFocusRef}>
      <ContentColumn style={[styles.body, { gap: theme.space['4'], marginTop: sheetContentPullUp() }]}>
        <ScreenTitle>Sikkerhetskopi</ScreenTitle>
        <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{BODY}</Text>
        <Button title={noted ? THANKS : BACKUP_INTEREST_LABEL} disabled={noted} onPress={interest} />
      </ContentColumn>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 24 },
});
