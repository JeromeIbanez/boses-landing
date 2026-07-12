import type { Shot, Story } from "../../types";

export type ImageResult = {
  /** Path relative to the run's output directory (Remotion public dir). */
  relPath: string;
};

export interface ImageProvider {
  name: string;
  available: () => boolean;
  /** Extension the provider writes, so callers can build the output path. */
  extension: "png" | "svg";
  generate: (args: {
    shot: Shot;
    shotIndex: number;
    story: Story;
    outAbsPath: string;
    relPath: string;
  }) => Promise<ImageResult>;
}
