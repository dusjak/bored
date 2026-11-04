import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

/**
 * Paint mix, isolated so it can be switched off.
 * One source image (the unfiltered shapes). The shader blurs by sampling:
 * a wide ring for Kubelka–Munk + OKLab, a tight ring for the goo alpha 18a−7.
 * m, radius and sigma are uniforms. The player draws this on a 4 pt grid
 * (one pixel per cell) and scales it up, so radius and sigma are in those pixels.
 */
const SOURCE = `
uniform shader image;
uniform float m;
uniform float radius;
uniform float sigma;

float cbrt(float x) {
  return sign(x) * pow(abs(x), 0.3333333);
}
float toLin(float c) {
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}
float toSrgb(float c) {
  float v = clamp(c, 0.0, 1.0);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * pow(v, 1.0 / 2.4) - 0.055;
}
float ksOf(float r) {
  float v = max(0.02, r);
  return (1.0 - v) * (1.0 - v) / (2.0 * v);
}
float rOfKs(float k) {
  return 1.0 + k - sqrt(k * k + 2.0 * k);
}
float3 linToLab(float r, float g, float b) {
  float l = cbrt(max(0.0, 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b));
  float m2 = cbrt(max(0.0, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b));
  float s = cbrt(max(0.0, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b));
  return float3(
    0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s
  );
}
float3 labToLin(float L, float a, float b) {
  float l0 = L + 0.3963377774 * a + 0.2158037573 * b;
  float m0 = L - 0.1055613458 * a - 0.0638541728 * b;
  float s0 = L - 0.0894841775 * a - 1.291485548 * b;
  float l = l0 * l0 * l0;
  float m2 = m0 * m0 * m0;
  float s = s0 * s0 * s0;
  return float3(
    4.0767416621 * l - 3.3077115913 * m2 + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m2 - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m2 + 1.707614701 * s
  );
}

void take(float2 p, out float w, out float ksr, out float ksg, out float ksb, out float L, out float A, out float B, out float C, out float cr, out float cg, out float cb) {
  w = 0.0; ksr = 0.0; ksg = 0.0; ksb = 0.0; L = 0.0; A = 0.0; B = 0.0; C = 0.0; cr = 0.0; cg = 0.0; cb = 0.0;
  half4 px = image.eval(p);
  if (px.a < 0.004) return;
  float a = px.a;
  float r = clamp(px.r / a, 0.0, 1.0);
  float g = clamp(px.g / a, 0.0, 1.0);
  float b = clamp(px.b / a, 0.0, 1.0);
  float lr = toLin(r);
  float lg = toLin(g);
  float lb = toLin(b);
  float3 lab = linToLab(lr, lg, lb);
  w = a;
  ksr = a * ksOf(lr);
  ksg = a * ksOf(lg);
  ksb = a * ksOf(lb);
  L = a * lab.x;
  A = a * lab.y;
  B = a * lab.z;
  C = a * length(float2(lab.y, lab.z));
  cr = a * r;
  cg = a * g;
  cb = a * b;
}

void addAt(float2 p, inout float w, inout float ksr, inout float ksg, inout float ksb, inout float L, inout float A, inout float B, inout float C) {
  float tw, tksr, tksg, tksb, tL, tA, tB, tC, tr, tg, tb;
  take(p, tw, tksr, tksg, tksb, tL, tA, tB, tC, tr, tg, tb);
  w += tw; ksr += tksr; ksg += tksg; ksb += tksb; L += tL; A += tA; B += tB; C += tC;
}

half4 main(float2 xy) {
  float cw, cksr, cksg, cksb, cL, cA, cB, cC, orr, og, ob;
  take(xy, cw, cksr, cksg, cksb, cL, cA, cB, cC, orr, og, ob);
  float ownR = cw > 0.001 ? orr / cw : 0.0;
  float ownG = cw > 0.001 ? og / cw : 0.0;
  float ownB = cw > 0.001 ? ob / cw : 0.0;

  float w = cw;
  float ksr = cksr;
  float ksg = cksg;
  float ksb = cksb;
  float L = cL;
  float A = cA;
  float B = cB;
  float C = cC;
  float rad = max(radius, 1.0);
  float sig = max(sigma, 0.5);
  addAt(xy + float2(rad, 0.0), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(-rad, 0.0), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(0.0, rad), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(0.0, -rad), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(rad * 0.707, rad * 0.707), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(-rad * 0.707, rad * 0.707), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(rad * 0.707, -rad * 0.707), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(-rad * 0.707, -rad * 0.707), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(rad * 0.5, 0.0), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(-rad * 0.5, 0.0), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(0.0, rad * 0.5), w, ksr, ksg, ksb, L, A, B, C);
  addAt(xy + float2(0.0, -rad * 0.5), w, ksr, ksg, ksb, L, A, B, C);
  float gw, gksr, gksg, gksb, gL, gA, gB, gC, gr, gg, gb;
  float goo = cw;
  take(xy + float2(sig * 2.0, 0.0), gw, gksr, gksg, gksb, gL, gA, gB, gC, gr, gg, gb);
  goo += gw;
  take(xy + float2(-sig * 2.0, 0.0), gw, gksr, gksg, gksb, gL, gA, gB, gC, gr, gg, gb);
  goo += gw;
  take(xy + float2(0.0, sig * 2.0), gw, gksr, gksg, gksb, gL, gA, gB, gC, gr, gg, gb);
  goo += gw;
  take(xy + float2(0.0, -sig * 2.0), gw, gksr, gksg, gksb, gL, gA, gB, gC, gr, gg, gb);
  goo += gw;
  float cov = goo / 5.0;
  float alpha = clamp(cov * 18.0 - 7.0, 0.0, 1.0);
  if (alpha <= 0.0) return half4(0.0, 0.0, 0.0, 0.0);

  float mr = ownR;
  float mg = ownG;
  float mb = ownB;
  if (w > 0.001) {
    float3 km = linToLab(rOfKs(ksr / w), rOfKs(ksg / w), rOfKs(ksb / w));
    float Ls = L / w;
    float aa = km.y + (A / w - km.y) * 0.35;
    float bb = km.z + (B / w - km.z) * 0.35;
    float v = length(float2(aa, bb));
    float tgt = 0.8 * (C / w);
    if (v > 0.000001 && v < tgt) {
      aa *= tgt / v;
      bb *= tgt / v;
    }
    float3 lin = labToLin(Ls, aa, bb);
    mr = toSrgb(lin.x);
    mg = toSrgb(lin.y);
    mb = toSrgb(lin.z);
  }
  float rr = clamp(ownR + (mr - ownR) * m, 0.0, 1.0);
  float gg2 = clamp(ownG + (mg - ownG) * m, 0.0, 1.0);
  float bb2 = clamp(ownB + (mb - ownB) * m, 0.0, 1.0);
  return half4(rr * alpha, gg2 * alpha, bb2 * alpha, alpha);
}
`;

export const sluketMixEffect: SkRuntimeEffect | null = Skia.RuntimeEffect.Make(SOURCE);
