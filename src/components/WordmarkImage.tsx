import { Image, type ImageSourcePropType } from 'react-native';

const dark = require('../../assets/splash/splash-wordmark-dark.png') as ImageSourcePropType;

/** S6 on the dark plate. The splash does not follow the app theme. Raster fallback when Skia cannot draw the vector. */
export const wordmarkSource = dark;

/** Same plate as the S6 vector: 148 × 46 pt, origin at the image centre. */
export const WORDMARK_W = 148;
export const WORDMARK_H = 46;

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
