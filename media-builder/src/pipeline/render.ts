import fs from "node:fs";
import path from "node:path";
import type { RenderManifest } from "../types";

/**
 * Find a usable Chromium. On a Mac, returning undefined lets Remotion
 * download/manage its own headless browser. REMOTION_BROWSER_EXECUTABLE
 * overrides; otherwise we probe Playwright-style install locations.
 */
function resolveBrowserExecutable(): string | undefined {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean) as string[];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    // Prefer headless_shell: recent full-Chromium builds removed the old
    // headless mode that Remotion's renderer drives.
    for (const entry of fs.readdirSync(root)) {
      if (!entry.startsWith("chromium_headless_shell-")) continue;
      const bin = path.join(root, entry, "chrome-linux", "headless_shell");
      if (fs.existsSync(bin)) return bin;
    }
    for (const entry of fs.readdirSync(root)) {
      if (!entry.startsWith("chromium-")) continue;
      const bin = path.join(root, entry, "chrome-linux", "chrome");
      if (fs.existsSync(bin)) return bin;
    }
  }
  return undefined;
}

/** Bundle the Remotion project and render the manifest to an mp4. */
export async function renderVideo(manifest: RenderManifest, outDir: string, outputPath: string): Promise<void> {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  console.log("• bundling remotion project…");
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/remotion/index.ts"),
    // The run's output dir doubles as the public dir, so generated
    // assets/audio resolve via staticFile() without copying.
    publicDir: path.resolve(outDir),
  });

  const inputProps = { manifest };
  const composition = await selectComposition({
    serveUrl,
    id: "StoryVideo",
    inputProps,
    browserExecutable: resolveBrowserExecutable(),
  });

  console.log(
    `• rendering ${composition.width}x${composition.height} @ ${composition.fps}fps, ` +
      `${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)}s)…`
  );
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    inputProps,
    outputLocation: outputPath,
    browserExecutable: resolveBrowserExecutable(),
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  rendering: ${(progress * 100).toFixed(0)}%   `);
    },
  });
  process.stdout.write("\n");
}
