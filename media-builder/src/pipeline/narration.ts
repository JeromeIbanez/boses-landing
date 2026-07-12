import fs from "node:fs";
import path from "node:path";
import { pickTtsProvider, synthesize } from "../providers/tts/index";
import type { ShotPlan } from "../types";

export type ShotAudio = Map<string, { relPath: string; durationSec: number; provider: string }>;

/** Generate narration audio per shot into <outDir>/audio/. */
export async function generateNarration(plan: ShotPlan, outDir: string): Promise<ShotAudio> {
  const provider = pickTtsProvider();
  console.log(`• narration: ${provider.name}${provider.name === "silence" ? " (no TTS available — video will be silent)" : ""}`);
  fs.mkdirSync(path.join(outDir, "audio"), { recursive: true });

  const result: ShotAudio = new Map();
  for (const shot of plan.shots) {
    const relPath = `audio/${shot.id}.wav`;
    const res = await synthesize(provider, shot.narrationText, path.join(outDir, relPath));
    console.log(`  ✓ ${shot.id} -> ${relPath} (${res.durationSec.toFixed(2)}s, ${res.provider})`);
    result.set(shot.id, { relPath, durationSec: res.durationSec, provider: res.provider });
  }
  return result;
}
