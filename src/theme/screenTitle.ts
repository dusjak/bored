import { screenPadding } from './theme.ts';

/**
 * DM Serif Display Italic draws outside its advance box.
 * "f" overhangs about 5px at headline size and 8px at display size.
 * The bleed stays inside the 16pt screen margin.
 */
export const ITALIC_BLEED = 8;

export type TitleAlign = 'left' | 'center';

export type TitleBox = {
  marginLeft: number;
  marginRight: number;
  paddingLeft: number;
  paddingRight: number;
  textAlign: TitleAlign;
  /** Null means wrap. Screen titles never ellipsize. */
  numberOfLines: null;
};

export function screenTitleBox(align: TitleAlign): TitleBox {
  const bleed = ITALIC_BLEED;
  if (align === 'center') {
    return {
      marginLeft: 0,
      marginRight: 0,
      paddingLeft: bleed,
      paddingRight: bleed,
      textAlign: 'center',
      numberOfLines: null,
    };
  }
  return {
    marginLeft: -bleed,
    marginRight: -bleed,
    paddingLeft: bleed,
    paddingRight: bleed,
    textAlign: 'left',
    numberOfLines: null,
  };
}

/** How far the first glyph's origin sits from the screen content edge. */
export function titleOrigin(box: TitleBox): number {
  return box.marginLeft + box.paddingLeft;
}

/**
 * Width the glyphs wrap inside, given the content column
 * (screen width minus the 16pt margin on each side).
 */
export function titleLineWidth(contentWidth: number, box: TitleBox): number {
  return contentWidth - box.marginLeft - box.marginRight - box.paddingLeft - box.paddingRight;
}

/** Room between the screen edge and the title's outer box. Always ≥ 0. */
export function titleEdgeRoom(box: TitleBox): number {
  return screenPadding + Math.min(box.marginLeft, box.marginRight);
}
