import { piperTts } from "./piper";
import { sayTts } from "./say";
import { silenceTts } from "./silence";
import type { TtsProvider, TtsResult } from "./types";

export type { TtsProvider, TtsResult } from "./types";

const PROVIDERS: Record<string, TtsProvider> = {
  piper: piperTts,
  say: sayTts,
  silence: silenceTts,
};

/**
 * Provider selection: MEDIA_BUILDER_TTS forces one; otherwise the first
 * available of piper -> say -> silence.
 */
export function pickTtsProvider(): TtsProvider {
  const forced = process.env.MEDIA_BUILDER_TTS;
  if (forced) {
    const p = PROVIDERS[forced];
    if (!p) throw new Error(`unknown MEDIA_BUILDER_TTS "${forced}" (piper|say|silence)`);
    return p;
  }
  for (const p of [piperTts, sayTts, silenceTts]) {
    if (p.available()) return p;
  }
  return silenceTts;
}

/** Synthesize with the chosen provider, falling back to silence on failure. */
export async function synthesize(
  provider: TtsProvider,
  text: string,
  outPath: string
): Promise<TtsResult & { provider: string }> {
  try {
    const res = await provider.synthesize(text, outPath);
    return { ...res, provider: provider.name };
  } catch (err) {
    if (provider.name === "silence") throw err;
    console.warn(`  ! ${provider.name} failed (${(err as Error).message}); falling back to silence`);
    const res = await silenceTts.synthesize(text, outPath);
    return { ...res, provider: "silence" };
  }
}
