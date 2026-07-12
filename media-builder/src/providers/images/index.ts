import { openaiImages } from "./openai";
import { placeholderImages } from "./placeholder";
import type { ImageProvider } from "./types";

export type { ImageProvider, ImageResult } from "./types";
export { placeholderImages };

const PROVIDERS: Record<string, ImageProvider> = {
  openai: openaiImages,
  placeholder: placeholderImages,
};

/**
 * Provider selection: MEDIA_BUILDER_IMAGES forces one; otherwise openai when
 * OPENAI_API_KEY is set, else offline placeholders.
 */
export function pickImageProvider(): ImageProvider {
  const forced = process.env.MEDIA_BUILDER_IMAGES;
  if (forced) {
    const p = PROVIDERS[forced];
    if (!p) throw new Error(`unknown MEDIA_BUILDER_IMAGES "${forced}" (openai|placeholder)`);
    return p;
  }
  return openaiImages.available() ? openaiImages : placeholderImages;
}
