import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { wavDurationSeconds } from "../../util/wav";
import type { TtsProvider } from "./types";

const piperBin = () => process.env.PIPER_BIN ?? "piper";
const piperVoice = () => process.env.PIPER_VOICE ?? "";

function binaryExists(bin: string): boolean {
  const res = spawnSync("which", [bin], { encoding: "utf8" });
  return res.status === 0;
}

/**
 * Local TTS via Piper (https://github.com/rhasspy/piper).
 * Requires PIPER_VOICE to point at a .onnx voice model; PIPER_BIN optional.
 */
export const piperTts: TtsProvider = {
  name: "piper",
  available: () => Boolean(piperVoice()) && fs.existsSync(piperVoice()) && binaryExists(piperBin()),
  synthesize: async (text, outPath) => {
    const res = spawnSync(piperBin(), ["--model", piperVoice(), "--output_file", outPath], {
      input: text,
      encoding: "utf8",
    });
    if (res.status !== 0 || !fs.existsSync(outPath)) {
      throw new Error(`piper failed: ${res.stderr || res.error?.message || "unknown error"}`);
    }
    return { path: outPath, durationSec: wavDurationSeconds(outPath) };
  },
};
