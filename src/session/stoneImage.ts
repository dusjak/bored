import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Skia, type SkImage } from '@shopify/react-native-skia';

const cache = new Map<number, SkImage>();
const pending = new Map<number, Promise<SkImage | null>>();

/** Decode a bundled stone once and keep it for the next screen. */
export function preloadStoneImage(source: number): Promise<SkImage | null> {
  const known = cache.get(source);
  if (known) return Promise.resolve(known);
  const inflight = pending.get(source);
  if (inflight) return inflight;
  const resolved = Image.resolveAssetSource(source);
  const task = (resolved?.uri ? Skia.Data.fromURI(resolved.uri) : Promise.resolve(null))
    .then((data) => {
      const image = data ? Skia.Image.MakeImageFromEncoded(data) : null;
      if (image) cache.set(source, image);
      pending.delete(source);
      return image;
    })
    .catch(() => {
      pending.delete(source);
      return null;
    });
  pending.set(source, task);
  return task;
}

/** The cached image on the first render when preload already finished. */
export function useCachedStoneImage(source: number): SkImage | null {
  const [image, setImage] = useState<SkImage | null>(() => cache.get(source) ?? null);
  useEffect(() => {
    const known = cache.get(source);
    if (known) {
      setImage(known);
      return;
    }
    let live = true;
    void preloadStoneImage(source).then((next) => {
      if (live && next) setImage(next);
    });
    return () => {
      live = false;
    };
  }, [source]);
  return image;
}
