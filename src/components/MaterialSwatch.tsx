import { Image, StyleSheet } from 'react-native';

import type { VisibleMaterialId } from '@/onboarding/flow';

/**
 * Rest-pose crop of the approved maps: albedo, multiply, then screen,
 * clipped to the empty silhouette. One still image per visible choice.
 */
const SWATCH = {
  gummi: require('../../assets/materials/swatches/gummi.png'),
  skifer: require('../../assets/materials/swatches/skifer.png'),
  floyel: require('../../assets/materials/swatches/floyel.png'),
} as const;

export function MaterialSwatch({ material }: { material: VisibleMaterialId }) {
  return <Image source={SWATCH[material]} resizeMode="contain" style={styles.image} />;
}

const styles = StyleSheet.create({
  image: { width: 44, height: 44 },
});
