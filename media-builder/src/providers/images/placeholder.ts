import fs from "node:fs";
import type { ImageProvider } from "./types";

const PALETTES: Record<string, { base: string; deep: string; glowA: string; glowB: string; line: string }> = {
  "moody-dark": { base: "#0b0e12", deep: "#05070a", glowA: "#22303f", glowB: "#3a2f28", line: "#8a949e" },
  "cold-blue": { base: "#0a1018", deep: "#050810", glowA: "#16304a", glowB: "#1d3a3f", line: "#7f98ad" },
  "warm-dusk": { base: "#120e0b", deep: "#0a0705", glowA: "#41301f", glowB: "#2f1d22", line: "#a89482" },
};

/** Deterministic pseudo-random in [0,1) from a seed, so re-runs are stable. */
function prand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Offline placeholder: an atmospheric 1080x1920 SVG (layered glows, grain,
 * vignette) so the pipeline renders a watchable video with zero API keys.
 */
export const placeholderImages: ImageProvider = {
  name: "placeholder",
  available: () => true,
  extension: "svg",
  generate: async ({ shot, shotIndex, story, outAbsPath, relPath }) => {
    const pal = PALETTES[story.style.palette] ?? PALETTES["moody-dark"];
    const seed = shotIndex + 1;
    const gx = 20 + prand(seed) * 60;
    const gy = 15 + prand(seed + 7) * 45;
    const hx = 20 + prand(seed + 13) * 60;
    const hy = 55 + prand(seed + 29) * 35;
    const hintRaw = shot.visual.prompt.length > 90 ? `${shot.visual.prompt.slice(0, 87)}…` : shot.visual.prompt;
    const hint = hintRaw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <radialGradient id="glowA" cx="${gx}%" cy="${gy}%" r="65%">
      <stop offset="0%" stop-color="${pal.glowA}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${pal.glowA}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="${hx}%" cy="${hy}%" r="70%">
      <stop offset="0%" stop-color="${pal.glowB}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${pal.glowB}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="46%" r="75%">
      <stop offset="55%" stop-color="${pal.deep}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${pal.deep}" stop-opacity="0.85"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="${pal.base}"/>
  <rect width="1080" height="1920" fill="url(#glowA)"/>
  <rect width="1080" height="1920" fill="url(#glowB)"/>
  <rect width="1080" height="1920" fill="url(#vignette)"/>
  <rect width="1080" height="1920" fill="${pal.deep}" opacity="0" filter="url(#grain)"/>
  <line x1="120" y1="1700" x2="340" y2="1700" stroke="${pal.line}" stroke-width="2" opacity="0.35"/>
  <text x="120" y="150" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="6" fill="${pal.line}" opacity="0.3">${String(shotIndex + 1).padStart(2, "0")}</text>
  <text x="120" y="1760" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="1" fill="${pal.line}" opacity="0.28">${hint}</text>
</svg>
`;
    fs.writeFileSync(outAbsPath, svg);
    return { relPath };
  },
};
