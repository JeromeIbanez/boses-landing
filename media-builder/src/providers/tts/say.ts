import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { wavDurationSeconds } from "../../util/wav";
import type { TtsProvider } from "./types";

/**
 * macOS built-in `say` — a zero-setup fallback so the pipeline produces real
 * narration on a Mac even before Piper is installed.
 */
export const sayTts: TtsProvider = {
  name: "say",
  available: () => os.platform() === "darwin" && spawnSync("which", ["say"]).status === 0,
  synthesize: async (text, outPath) => {
    const args = ["-o", outPath, "--data-format=LEI16@22050"];
    if (process.env.SAY_VOICE) args.push("-v", process.env.SAY_VOICE);
    args.push(text);
    const res = spawnSync("say", args, { encoding: "utf8" });
    if (res.status !== 0 || !fs.existsSync(outPath)) {
      throw new Error(`say failed: ${res.stderr || res.error?.message || "unknown error"}`);
    }
    return { path: outPath, durationSec: wavDurationSeconds(outPath) };
  },
};
