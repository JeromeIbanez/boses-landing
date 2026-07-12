import fs from "node:fs";
import path from "node:path";

/** Minimal .env loader — real values in the environment always win. */
export function loadDotEnv(dir: string = process.cwd()): void {
  const file = path.join(dir, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Rough speech duration estimate at a calm, serious pace (~2.4 words/sec). */
export function estimateSpeechSeconds(text: string): number {
  return clamp(wordCount(text) / 2.4, 1.6, 12);
}
