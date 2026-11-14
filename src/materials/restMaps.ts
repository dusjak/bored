/**
 * Rest-pose material maps from the 2026-11-07 master export.
 * Five surfaces, one placement. This does not deform, relight, or replace
 * the shipped gummi rasters.
 */

export const MATERIAL_IDS = ['gummi', 'skifer', 'kull', 'emalje', 'floyel'] as const;
export type MaterialId = (typeof MATERIAL_IDS)[number];

export const MATERIAL_MAP_PX = 1200;
export const MATERIAL_CENTER_PX = 600;
/** Source pixels per nominal body width. 720 px is the body's width on the 1200 artboard. */
export const MATERIAL_BODY_PX = 720;

export const MATERIAL_LAYERS = ['base', 'shade-multiply', 'light-screen'] as const;
export type MaterialLayer = (typeof MATERIAL_LAYERS)[number];

/** Blend inside one clipped, isolated body. Never against the screen behind it. */
export const MATERIAL_BLEND = ['srcOver', 'multiply', 'screen'] as const;

/** ImageShader tile mode. The maps are not seamless. */
export const MATERIAL_TILE = 'clamp' as const;

export const MATERIAL_DIGIT_FONT = 'Figtree_400Regular';
export const MATERIAL_DIGIT_COLOR = '#F8F6F2';

/**
 * SHA-256 of the PNGs copied from materialer-2026-11-07.
 * Gummi is the clean upstream surface. Its edge is not the shipped premultiplied raster.
 */
export const MATERIAL_SHA256: Record<MaterialId, Record<MaterialLayer, string>> = {
  gummi: {
    base: '4612af76f90d15c7c03280f121f141465a17d0cadec51e5cd1a82efd0740bf1b',
    'shade-multiply': 'bf52f0e0dca1eab598a64752c078a18593164d076be0dad1953f21d163091d42',
    'light-screen': 'b4c13d0a0d5a9bee5bf4d044c31dc7841336727f5f68a62befba14659e2c933c',
  },
  skifer: {
    base: '40888c0c76a45b6157bbb077855f446a62b0697130cfd91eef08180c86ddce2b',
    'shade-multiply': 'a06dcf92b905e294c47f8c59fcc842b721b74287bdb6dd336595db5f75f4b4d0',
    'light-screen': '5187473a8b017c9ecd439e57ce38cd96bf84932c4256cafe97214e7ec61603aa',
  },
  kull: {
    base: '5b7a2c88cd57495f8b1607912c06251b7a5ba75a1754c2b891a470ecc1242594',
    'shade-multiply': '7289fed067b1de36f4da52118cc6544be00623bf60ceef36a56f05397d71d85e',
    'light-screen': 'a7db128f7f9af42bf0cef815207c02f29a98bd466e793dc170c7f6646cccc7cc',
  },
  emalje: {
    base: '4b2d35e2f62e2f00e335e10107ccb908ddd902f61e25b8361f9ef88c7ac76a75',
    'shade-multiply': 'a865cb9dc9f9fc0a048e1081d0302cffa252d3262d491064dcb1369378f66723',
    'light-screen': 'e84ddf9bf783eb6083a67e93772b708a99f589b524c13f8e248b1f6be82382da',
  },
  floyel: {
    base: '328d5e5fd25f6de0c76b350a886644bd43a6a1e8e2a232a73b4b9d33fcc919bf',
    'shade-multiply': 'e02f76d2c57978e918f309d05c57bd5b2c3bd9ace5f6f0d13067a1375765dc4e',
    'light-screen': 'ed4f45921ea9a3e4bd43a0ffdc9eac997e3ef8a58798e9b507458f61a2d00adf',
  },
};

/** Upstream renderer hashes recorded by the export. The scripts themselves are not in this repo. */
export const MATERIAL_SOURCE_SHA256 = {
  'build.py': '39866c086db86c8cdb1db136271f234a66a2ecfab2510bdbf42bd1f5f2cf0687',
  'material.py': '158926c056b0eab387bfb006043e931dc3ba082cdc57bfc002e9de8b0dccc5a4',
  'stone_layer.py': '36e7da78f740a090e03af8517d09407d7eef92ed2851b72aed73a6d7558c52a2',
  'skjermer.py': 'b40c6a9ed1dd626c4eff6b95e15164ba3d87244c8f29bee42499fefcc1847772',
  'hires.py': '4a1f167c1cf81d7c4a8e245f2e4d0007775106f70448d5f00ec7a0a1bece25e7',
  'export_assets.py': 'd23ba1130866cb369dfeb932ccd379477db6400cb83bd05dd080d80a8e256d7b',
  'stone-home@6x.npz': '1a9c3eb047fd782780dc30aff00c57e46d689afe3fe564d4b46c7df1063e2f06',
} as const;

export type MaterialPlacement = {
  /** Points per source pixel. `widthPt / 720`. */
  ptPerPx: number;
  /** Canvas position of source pixel (0, 0). */
  tx: number;
  ty: number;
  /** Artboard side. `400 * widthPt / 240`, which is `1200 * ptPerPx`. */
  artboardPt: number;
};

/**
 * Shared placement. Source (600, 600) sits on `(cx, cy)`.
 * The artboard is wider than the body. Do not scale the whole map down to the body width.
 */
export function materialPlacement(widthPt: number, cx: number, cy: number): MaterialPlacement {
  const ptPerPx = widthPt / MATERIAL_BODY_PX;
  return {
    ptPerPx,
    tx: cx - MATERIAL_CENTER_PX * ptPerPx,
    ty: cy - MATERIAL_CENTER_PX * ptPerPx,
    artboardPt: MATERIAL_MAP_PX * ptPerPx,
  };
}

/**
 * Skia image-shader local matrix, column-major 3×3.
 * It maps a canvas point back to a source pixel so tile clamp holds the edge.
 */
export function materialLocalMatrix(widthPt: number, cx: number, cy: number): number[] {
  const place = materialPlacement(widthPt, cx, cy);
  const inv = place.ptPerPx === 0 ? 0 : 1 / place.ptPerPx;
  return [inv, 0, 0, 0, inv, 0, -place.tx * inv, -place.ty * inv, 1];
}

export function sourcePixelAt(
  widthPt: number,
  cx: number,
  cy: number,
  canvasX: number,
  canvasY: number,
): { x: number; y: number } {
  const m = materialLocalMatrix(widthPt, cx, cy);
  return { x: m[0] * canvasX + m[6], y: m[4] * canvasY + m[7] };
}

export type MaterialRenderPlan = {
  /** Light maps composite inside the body layer. They are not drawn on the page. */
  drawsLightOnBackground: false;
  /** Albedo without the two light maps is not a finished material. */
  baseOnlyComplete: false;
  restStack: boolean;
  /** Rest light is not a deformation shader. */
  deformsLight: false;
  /** The dark 3:1 rim was not in this export. */
  darkRim: false;
};

export function materialRenderPlan(layers: { base: boolean; multiply: boolean; screen: boolean }): MaterialRenderPlan {
  return {
    drawsLightOnBackground: false,
    baseOnlyComplete: false,
    restStack: layers.base && layers.multiply && layers.screen,
    deformsLight: false,
    darkRim: false,
  };
}

/** The clean gummi master is not a drop-in for the shipped premultiplied stones. */
export const REST_MASTER_REPLACES_SHIPPED_GUMMI = false;
