import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const FFMPEG_CORE_VERSION = "0.12.6";
const FFMPEG_CORE_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg(onProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(progress));
  }

  await ffmpeg.load({
    coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export type VideoCompressOptions = {
  maxWidth?: number;   // 기본 1280
  crf?: number;        // 기본 30 (높을수록 더 압축, 낮을수록 고화질)
  onProgress?: (ratio: number) => void;
};

export async function compressClientVideo(
  file: File,
  { maxWidth = 1280, crf = 30, onProgress }: VideoCompressOptions = {},
): Promise<File> {
  const instance = await loadFFmpeg(onProgress);

  const inputExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `input.${inputExt}`;

  await instance.writeFile(inputName, await fetchFile(file));

  await instance.exec([
    "-i", inputName,
    "-vf", `scale='min(${maxWidth},iw)':-2`,
    "-c:v", "libx264",
    "-crf", String(crf),
    "-preset", "fast",
    "-an",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  const data = await instance.readFile("output.mp4");
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : new Uint8Array(data.buffer instanceof ArrayBuffer ? data.buffer : new ArrayBuffer(0), data.byteOffset, data.byteLength);
  return new File([bytes], "video.mp4", { type: "video/mp4" });
}
