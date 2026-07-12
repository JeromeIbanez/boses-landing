export type TtsResult = {
  path: string;
  durationSec: number;
};

export interface TtsProvider {
  name: string;
  available: () => boolean;
  synthesize: (text: string, outPath: string) => Promise<TtsResult>;
}
