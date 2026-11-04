import { Image, type ImageSourcePropType } from 'react-native';

const dark = require('../../assets/splash/splash-wordmark-s6-dark.png') as ImageSourcePropType;

/** S6 on the dark plate. The splash does not follow the app theme. Raster fallback when Skia cannot draw the vector. */
export const wordmarkSource = dark;

/**
 * Native splash canvas, 160 × 80 pt. The S6 vector is centred on the same point.
 * The extra padding is the native image; the glyph sits in the middle.
 */
export const WORDMARK_W = 160;
export const WORDMARK_H = 80;

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

export function WordmarkImage() {
  return (
    <Image
      source={wordmarkSource}
      style={wordmarkBox}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
