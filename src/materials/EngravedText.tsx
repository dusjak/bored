import { useMemo } from 'react';
import { View } from 'react-native';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Blur, Canvas, Group, Paint, Text, useFont } from '@shopify/react-native-skia';

import { ENGRAVE, ENGRAVED_DIGIT_COLOR } from '@/materials/engraving';

type Props = {
  text: string;
  fontSize: number;
  /** Extra advance between glyphs, in em. 0 keeps the font’s own spacing. */
  trackingEm?: number;
};

/** Canvas box and where the digit ink sits inside it, so callers can pin the ink center. */
export function engravedBox(fontSize: number): { height: number; inkCenter: number } {
  const baseline = fontSize + ENGRAVE.edgeShift + 1;
  const height = Math.ceil(fontSize * 1.35 + ENGRAVE.edgeShift * 2 + 4);
  return { height, inkCenter: baseline - fontSize * 0.35 };
}

/**
 * White Figtree 400 with the font’s own advances, plus the Gravert v2 cut.
 * Glyphs are drawn separately so the cut can shift, but each one starts where
 * the font would have put it. There is no tabular slot.
 * The picture is this canvas. It does not rebuild while the lump springs.
 */
/** Pins the digit ink on `centerY` points from the parent’s vertical centre. */
export function PinnedEngraving({ text, fontSize, centerY, trackingEm = 0 }: Props & { centerY: number }) {
  const box = engravedBox(fontSize);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', marginTop: centerY - box.inkCenter, alignItems: 'center' }}>
      <EngravedText text={text} fontSize={fontSize} trackingEm={trackingEm} />
    </View>
  );
}

export function EngravedText({ text, fontSize, trackingEm = 0 }: Props) {
  const font = useFont(Figtree_400Regular, fontSize);
  const layout = useMemo(() => {
    if (!font) return null;
    const chars = [...text];
    const tracking = trackingEm * fontSize;
    let cursor = 0;
    const glyphs = chars.map((char, index) => {
      const before = font.getTextWidth(text.slice(0, index));
      const advance = font.getTextWidth(text.slice(0, index + 1)) - before;
      const x = ENGRAVE.edgeShift + cursor;
      cursor += advance + (index < chars.length - 1 ? tracking : 0);
      return { char, x };
    });
    const width = Math.ceil(ENGRAVE.edgeShift + cursor + ENGRAVE.edgeShift + 4);
    const height = Math.ceil(fontSize * 1.35 + ENGRAVE.edgeShift * 2 + 4);
    const baseline = fontSize + ENGRAVE.edgeShift + 1;
    return { glyphs, width, height, baseline };
  }, [font, fontSize, text, trackingEm]);

  if (!font || !layout) return null;
  const { glyphs, width, height, baseline } = layout;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Cut glyphs={glyphs} font={font} baseline={baseline} dx={ENGRAVE.edgeShift} dy={ENGRAVE.edgeShift} color="#FFFFFF" opacity={ENGRAVE.lightStrength} blur={ENGRAVE.edgeBlur} />
      <Cut glyphs={glyphs} font={font} baseline={baseline} dx={-ENGRAVE.edgeShift} dy={-ENGRAVE.edgeShift} color="#111110" opacity={ENGRAVE.darkStrength} blur={ENGRAVE.edgeBlur} />
      <Group layer={<Paint><Blur blur={ENGRAVE.soften} /></Paint>}>
        {glyphs.map((glyph) => (
          <Text key={`fill-${glyph.x}`} text={glyph.char} font={font} x={glyph.x} y={baseline} color={ENGRAVED_DIGIT_COLOR} />
        ))}
      </Group>
      <Group layer={<Paint><Blur blur={ENGRAVE.innerBlur} /></Paint>} opacity={ENGRAVE.innerStrength}>
        {glyphs.map((glyph) => (
          <Text key={`ink-${glyph.x}`} text={glyph.char} font={font} x={glyph.x} y={baseline} color="#000000" />
        ))}
        <Group blendMode="dstOut">
          {glyphs.map((glyph) => (
            <Text
              key={`hole-${glyph.x}`}
              text={glyph.char}
              font={font}
              x={glyph.x + ENGRAVE.innerShift}
              y={baseline + ENGRAVE.innerShift}
              color="#000000"
            />
          ))}
        </Group>
      </Group>
    </Canvas>
  );
}

function Cut({
  glyphs,
  font,
  baseline,
  dx,
  dy,
  color,
  opacity,
  blur,
}: {
  glyphs: { char: string; x: number }[];
  font: NonNullable<ReturnType<typeof useFont>>;
  baseline: number;
  dx: number;
  dy: number;
  color: string;
  opacity: number;
  blur: number;
}) {
  return (
    <Group layer={<Paint><Blur blur={blur} /></Paint>} opacity={opacity}>
      {glyphs.map((glyph) => (
        <Text key={`edge-${dx}-${glyph.x}`} text={glyph.char} font={font} x={glyph.x + dx} y={baseline + dy} color={color} />
      ))}
      <Group blendMode="dstOut">
        {glyphs.map((glyph) => (
          <Text key={`keep-${dx}-${glyph.x}`} text={glyph.char} font={font} x={glyph.x} y={baseline} color={color} />
        ))}
      </Group>
    </Group>
  );
}
