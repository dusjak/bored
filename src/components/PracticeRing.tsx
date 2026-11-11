import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { BlurMask, Canvas, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';

import { HOLD, RING_OFFSET, contourGradient, mixHex } from '@/session/holdToEnd';
import { sessionStoneScale, writeKlumpenPath } from '@/session/klumpenShape';
import { useTheme } from '@/theme';

/** Skia’s sweep starts at the right. This rotation puts 0 at the top, clockwise. */
const SWEEP_NORTH = -Math.PI / 2;
const CANVAS = 340;

export type PracticeRingLook = {
  progress: number;
  track: number;
  glow: number;
  glowR: number;
  strokeW: number;
  litMix: number;
  en: number;
};

/** The session hold ring, on the still practice stone. It stays painted after the hold. */
export function PracticeRing({ minutes, look }: { minutes: number; look: PracticeRingLook }) {
  const { theme } = useTheme();
  const scale = sessionStoneScale(minutes);
  const cx = CANVAS / 2;
  const cy = CANVAS / 2;
  const path = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    writeKlumpenPath(builder, cx, cy, 0, 0, 0, 0, RING_OFFSET, scale, null);
    return builder.build();
  }, [cx, cy, scale]);
  const center = vec(cx, cy);
  const core = theme.color.glow.core;
  const color = look.litMix > 0 ? mixHex(theme.color.session['ring-track'], core, look.litMix) : core;
  const lit = contourGradient(look.progress, color, look.track > 0.02 ? 1 : 0, true);
  const glow = contourGradient(look.progress, theme.color.glow.amber, look.glow, true);
  const highlight = contourGradient(look.progress, theme.color.glow.highlight, look.en, true);
  if (look.track <= 0.02 && look.progress <= 0) return null;
  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Path
        path={path}
        style="stroke"
        strokeWidth={HOLD.trackW}
        strokeJoin="round"
        color={theme.color.session['ring-track']}
        opacity={look.track}
      />
      <Path path={path} style="stroke" strokeWidth={look.strokeW * HOLD.glowGain} strokeJoin="round" opacity={look.track}>
        <SweepGradient c={center} start={0} end={360} transform={[{ rotate: SWEEP_NORTH }]} origin={center} colors={glow.colors} positions={glow.positions} />
        <BlurMask blur={look.glowR < 0.5 ? 0.5 : look.glowR} style="normal" respectCTM />
      </Path>
      <Path path={path} style="stroke" strokeWidth={look.strokeW} strokeJoin="round" opacity={look.track}>
        <SweepGradient c={center} start={0} end={360} transform={[{ rotate: SWEEP_NORTH }]} origin={center} colors={lit.colors} positions={lit.positions} />
      </Path>
      <Path path={path} style="stroke" strokeWidth={HOLD.highlightW} strokeJoin="round" opacity={look.track}>
        <SweepGradient
          c={center}
          start={0}
          end={360}
          transform={[{ rotate: SWEEP_NORTH }]}
          origin={center}
          colors={highlight.colors}
          positions={highlight.positions}
        />
      </Path>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    width: CANVAS,
    height: CANVAS,
    left: '50%',
    top: '50%',
    marginLeft: -CANVAS / 2,
    marginTop: -CANVAS / 2,
  },
});
