import { Figtree_300Light } from '@expo-google-fonts/figtree/300Light';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display/400Regular_Italic';

/**
 * System F faces. This map is the only font registry.
 * The root layout loads it once with useFonts. On SDK 58 a family loads once:
 * a later useFonts call does not add faces, so every weight has to be here.
 * Tab labels use Figtree Medium (`fonts.sansMedium` in theme.ts). Do not load Figtree again.
 */
export const fontAssets = {
  Figtree_300Light,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
};
