/**
 * GPU rim. Lengths are the source point lengths at every stone size.
 * Erosion is 4 cross steps at the source sample of 3 px/pt, which is 4/3 pt.
 * The shift is 3 pt. The blur is the source truncated gaussian, σ = 2 px = 2/3 pt.
 * The filter runs in point space, so a size spring does not scale the band.
 */

import { RIM_BLUR_PT, RIM_EROSION_PT, RIM_GAIN, RIM_SAMPLE_PX_PER_PT, RIM_SHIFT_PT } from './pathLight.ts';

export const RIM_SAMPLE_STEP_PT = 1 / RIM_SAMPLE_PX_PER_PT;
export const RIM_EROSION_STEPS = Math.round(RIM_EROSION_PT * RIM_SAMPLE_PX_PER_PT);

function gaussWeights(sigmaPx: number): number[] {
  const radius = Math.max(1, Math.ceil(sigmaPx * 3));
  const raw: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const w = Math.exp(-0.5 * (i / sigmaPx) * (i / sigmaPx));
    raw.push(w);
    sum += w;
  }
  return raw.map((w) => w / sum);
}

/** σ = 2 source pixels. Same truncation as `gaussianBlur`. */
export const RIM_GAUSS_WEIGHTS = gaussWeights(RIM_BLUR_PT * RIM_SAMPLE_PX_PER_PT);

const STEP = RIM_SAMPLE_STEP_PT.toFixed(8);
const SHIFT = RIM_SHIFT_PT.toFixed(1);
const GAIN = RIM_GAIN.toFixed(1);
const RADIUS = (RIM_GAUSS_WEIGHTS.length - 1) / 2;

function blurBody(axis: 'x' | 'y'): string {
  return RIM_GAUSS_WEIGHTS.map((weight, index) => {
    const i = index - RADIUS;
    const dx = axis === 'x' ? `${i}.0 * ${STEP}` : '0.0';
    const dy = axis === 'y' ? `${i}.0 * ${STEP}` : '0.0';
    return `  acc += edge.eval(p + float2(${dx}, ${dy})).r * ${weight.toFixed(8)};`;
  }).join('\n');
}

export const RIM_EDGE_SKSL = `
uniform shader coverage;

float maskAt(float2 p) {
  return coverage.eval(p).a > 0.5 ? 1.0 : 0.0;
}

half4 main(float2 p) {
  float keep = 1.0;
  for (int dy = -${RIM_EROSION_STEPS}; dy <= ${RIM_EROSION_STEPS}; ++dy) {
    for (int dx = -${RIM_EROSION_STEPS}; dx <= ${RIM_EROSION_STEPS}; ++dx) {
      float ax = abs(float(dx));
      float ay = abs(float(dy));
      if (ax + ay <= ${RIM_EROSION_STEPS}.0 && maskAt(p + float2(float(dx), float(dy)) * ${STEP}) < 0.5) {
        keep = 0.0;
      }
    }
  }
  float m = maskAt(p);
  float shifted = maskAt(p - float2(${SHIFT}, ${SHIFT}));
  float edge = m * (1.0 - keep) * (1.0 - shifted);
  return half4(edge);
}
`;

export const RIM_BLUR_X_SKSL = `
uniform shader edge;

half4 main(float2 p) {
  float acc = 0.0;
${blurBody('x')}
  return half4(acc);
}
`;

export const RIM_BLUR_Y_SKSL = `
uniform shader edge;

half4 main(float2 p) {
  float acc = 0.0;
${blurBody('y')}
  return half4(acc);
}
`;

export const RIM_TINT_SKSL = `
uniform shader blurred;
uniform shader coverage;
uniform float rimK;

half4 main(float2 p) {
  float m = coverage.eval(p).a > 0.5 ? 1.0 : 0.0;
  float band = m * min(1.0, blurred.eval(p).r * ${GAIN});
  float3 col = float3(120.0, 114.0, 104.0) / 255.0 * band * rimK;
  return half4(col, band * rimK);
}
`;

/** Furthest sample, in points. The runtime-shader filter must allow this radius. */
export const RIM_EDGE_SAMPLE_RADIUS_PT = Math.max(RIM_EROSION_PT, RIM_SHIFT_PT);
export const RIM_BLUR_SAMPLE_RADIUS_PT = RADIUS * RIM_SAMPLE_STEP_PT;
