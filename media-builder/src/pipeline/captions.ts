import type { CaptionCue } from "../types";

const MAX_CHARS = 26;
const MAX_WORDS = 4;

/**
 * Chunk narration into short caption cues and distribute them across the
 * audio duration proportionally to character length. Cheap and provider-free;
 * swap for forced alignment later without touching the renderer.
 */
export function buildCaptions(text: string, durationSec: number): CaptionCue[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || durationSec <= 0) return [];

  const chunks: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidate = [...current, word].join(" ");
    if (current.length > 0 && (candidate.length > MAX_CHARS || current.length >= MAX_WORDS)) {
      chunks.push(current.join(" "));
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));

  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
  const cues: CaptionCue[] = [];
  let cursor = 0;
  for (const chunk of chunks) {
    const share = (chunk.length / totalChars) * durationSec;
    const startSec = Math.round(cursor * 100) / 100;
    cursor += share;
    const endSec = Math.round(Math.min(cursor, durationSec) * 100) / 100;
    cues.push({ text: chunk, startSec, endSec });
  }
  return cues;
}
