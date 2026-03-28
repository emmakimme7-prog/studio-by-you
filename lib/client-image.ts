export async function compressClientImage(
  file: File,
  maxWidth = 1600,
  quality = 0.88,
  preferJpeg = false,
): Promise<string> {
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

      const outputType = preferJpeg ? "image/jpeg" : file.type === "image/png" ? "image/png" : "image/jpeg";
      if (outputType === "image/png") {
        resolve(canvas.toDataURL(outputType));
        return;
      }

      resolve(canvas.toDataURL(outputType, quality));
    };

    img.onerror = reject;
    img.src = url;
  });
}
