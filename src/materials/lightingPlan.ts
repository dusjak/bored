/**
 * Decides when a form drag may rebuild the live lighting.
 * The silhouette itself is not this plan. The path still follows the finger.
 * Macro normals and the rim gain stay on the last settled shape until release,
 * a material change, or a settled shape that is not the cached one.
 * A stable `generation` is the hook dependency, so the rim shaders are not compiled per move.
 */

export type LightingCache = {
  material: string;
  shapeKey: string;
  generation: string;
};

export type LightingPlan = {
  /** 64² silhouette normals. */
  rebuildMacro: boolean;
  /** Point-space rim gain. A new gain is what recompiles the rim filter. */
  refitRim: boolean;
  generation: string;
  cache: LightingCache;
};

export function planFormLighting(input: {
  holding: boolean;
  material: string;
  shapeKey: string;
  cache: LightingCache | null;
}): LightingPlan {
  if (input.holding && input.cache && input.cache.material === input.material) {
    return {
      rebuildMacro: false,
      refitRim: false,
      generation: input.cache.generation,
      cache: input.cache,
    };
  }
  const generation = `settle:${input.material}:${input.shapeKey}`;
  const same =
    input.cache != null &&
    input.cache.material === input.material &&
    input.cache.shapeKey === input.shapeKey;
  if (same && input.cache) {
    return { rebuildMacro: false, refitRim: false, generation: input.cache.generation, cache: input.cache };
  }
  return {
    rebuildMacro: true,
    refitRim: true,
    generation,
    cache: { material: input.material, shapeKey: input.shapeKey, generation },
  };
}
