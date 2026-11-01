import { Image, type ImageSourcePropType } from 'react-native';

import { WORDMARK_H, WORDMARK_W } from '@/splash/sluket';

const light = require('../../assets/splash/splash-wordmark-light.png') as ImageSourcePropType;
const dark = require('../../assets/splash/splash-wordmark-dark.png') as ImageSourcePropType;

/** Same PNG the native splash uses. Metro resolves @2x and @3x beside the 1x file. */
export function wordmarkSource(scheme: 'light' | 'dark'): ImageSourcePropType {
  return scheme === 'dark' ? dark : light;
}

/**
 * Centred on the full window, not the safe area.
 * `left`/`top` 50% plus a negative margin matches the native splash image placement.
 */
export const wordmarkBox = {
  position: 'absolute' as const,
  width: WORDMARK_W,
  height: WORDMARK_H,
  left: '50%' as const,
  top: '50%' as const,
  marginLeft: -WORDMARK_W / 2,
  marginTop: -WORDMARK_H / 2,
};

/** Period-glyph centre inside the 160×80 canvas. Scale the handover around this point. */
export const PERIOD_ORIGIN = '142.24px 40.31px';

export function WordmarkImage({ scheme }: { scheme: 'light' | 'dark' }) {
  return (
    <Image
      source={wordmarkSource(scheme)}
      style={wordmarkBox}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
