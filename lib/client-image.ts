type CompressOptions = {
  maxWidth?: number;
  quality?: number;
  preferJpeg?: boolean;
};

type CropOptions = {
  maxWidth?: number;
  quality?: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
};

async function drawCompressedCanvas(file: File, maxWidth: number): Promise<{ canvas: HTMLCanvasElement; outputType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context error"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        canvas,
        outputType: file.type === "image/png" ? "image/png" : "image/jpeg",
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode error"));
    };
    img.src = url;
  });
}

export async function compressClientImage(file: File, maxWidth = 1600, quality = 0.86, _preferJpeg = false): Promise<string> {
  const compressed = await compressClientImageFile(file, { maxWidth, quality });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("file read error"));
    reader.readAsDataURL(compressed);
  });
}

export async function compressClientImageFile(
  file: File,
  { maxWidth = 1600, quality = 0.86 }: CompressOptions = {},
): Promise<File> {
  const { canvas, outputType } = await drawCompressedCanvas(file, maxWidth);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error("image encode error"));
          return;
        }
        resolve(nextBlob);
      },
      outputType,
      outputType === "image/png" ? undefined : quality,
    );
  });

  const ext = outputType === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([blob], `${baseName}.${ext}`, { type: outputType });
}

export async function cropClientImageFile(
  file: File,
  {
    maxWidth = 1800,
    quality = 0.9,
    cropX = 0,
    cropY = 0,
    cropWidth,
    cropHeight,
  }: CropOptions = {},
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(url);

      const normalizedWidth = Math.max(1, Math.min(img.width, Math.round(cropWidth ?? img.width)));
      const normalizedHeight = Math.max(1, Math.min(img.height, Math.round(cropHeight ?? img.height)));
      const sourceX = Math.max(0, Math.min(img.width - normalizedWidth, Math.round(cropX)));
      const sourceY = Math.max(0, Math.min(img.height - normalizedHeight, Math.round(cropY)));
      const scale = Math.min(1, maxWidth / normalizedWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(normalizedWidth * scale);
      canvas.height = Math.round(normalizedHeight * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context error"));
        return;
      }

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        normalizedWidth,
        normalizedHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolveBlob, rejectBlob) => {
        canvas.toBlob(
          (nextBlob) => {
            if (!nextBlob) {
              rejectBlob(new Error("image encode error"));
              return;
            }
            resolveBlob(nextBlob);
          },
          outputType,
          outputType === "image/png" ? undefined : quality,
        );
      });

      const ext = outputType === "image/png" ? "png" : "jpg";
      const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
      resolve(new File([blob], `${baseName}.${ext}`, { type: outputType }));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode error"));
    };

    img.src = url;
  });
}
