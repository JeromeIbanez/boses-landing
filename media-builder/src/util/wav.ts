import fs from "node:fs";

const SAMPLE_RATE = 22050;

/** Write a 16-bit mono PCM WAV of silence. Used by the fallback TTS provider. */
export function writeSilenceWav(filePath: string, seconds: number): void {
  const numSamples = Math.max(1, Math.round(seconds * SAMPLE_RATE));
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize); // samples default to 0 = silence
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filePath, buf);
}

/** Read the duration of a PCM WAV file by walking its RIFF chunks. */
export function wavDurationSeconds(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${filePath} is not a WAV file`);
  }
  let byteRate = 0;
  let dataSize = 0;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      byteRate = buf.readUInt32LE(offset + 8 + 8);
    } else if (id === "data") {
      dataSize = size;
    }
    offset += 8 + size + (size % 2);
  }
  if (!byteRate || !dataSize) {
    throw new Error(`could not parse WAV chunks in ${filePath}`);
  }
  return dataSize / byteRate;
}
