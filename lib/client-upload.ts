async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("파일을 읽을 수 없습니다."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

function isStorageUploadError(message: string): boolean {
  return /(저장소|storage|blob|blocked|suspend|upload failed)/i.test(message);
}

export async function uploadImageFile(file: File): Promise<string> {
  const { compressClientImageFile } = await import("@/lib/client-image");
  const compressed = await compressClientImageFile(file);
  return uploadMediaFile(compressed);
}

export function isVideoSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("data:video/")) return true;
  return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(src);
}

export async function uploadMediaFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "파일 업로드에 실패했습니다.";
    if (isStorageUploadError(message)) {
      return await fileToDataUrl(file);
    }
    throw error;
  }

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    const message = error || "파일 업로드에 실패했습니다.";
    if (isStorageUploadError(message)) {
      return await fileToDataUrl(file);
    }
    throw new Error(message);
  }

  const { url } = await response.json();
  return url as string;
}

export async function uploadVideoFile(file: File): Promise<string> {
  try {
    const { upload } = await import("@vercel/blob/client");
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await upload(filename, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload-video",
      multipart: true,
    });
    return blob.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "파일 업로드에 실패했습니다.";
    if (!isStorageUploadError(message)) {
      throw error;
    }
    return await uploadMediaFile(file);
  }
}
