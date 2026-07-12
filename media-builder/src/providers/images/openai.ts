import fs from "node:fs";
import type { ImageProvider } from "./types";

/**
 * Real image generation via OpenAI (gpt-image-1 by default). Only active when
 * OPENAI_API_KEY is set. Portrait 1024x1536; Remotion scales to 1080x1920.
 */
export const openaiImages: ImageProvider = {
  name: "openai",
  available: () => Boolean(process.env.OPENAI_API_KEY),
  extension: "png",
  generate: async ({ shot, outAbsPath, relPath }) => {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI();
    const res = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
      prompt: shot.visual.prompt,
      size: "1024x1536",
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai returned no image data");
    fs.writeFileSync(outAbsPath, Buffer.from(b64, "base64"));
    return { relPath };
  },
};
