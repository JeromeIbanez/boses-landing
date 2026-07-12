import { estimateSpeechSeconds } from "../../util/env";
import { writeSilenceWav } from "../../util/wav";
import type { TtsProvider } from "./types";

/**
 * Last-resort provider: writes silence sized to an estimated speech duration
 * so the rest of the pipeline (captions, shot timing, render) still works.
 */
export const silenceTts: TtsProvider = {
  name: "silence",
  available: () => true,
  synthesize: async (text, outPath) => {
    const durationSec = estimateSpeechSeconds(text);
    writeSilenceWav(outPath, durationSec);
    return { path: outPath, durationSec };
  },
};
