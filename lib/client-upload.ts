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

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    throw new Error(error || "파일 업로드에 실패했습니다.");
  }

  const { url } = await response.json();
  return url as string;
}

export async function uploadVideoFile(file: File): Promise<string> {
  const { upload } = await import("@vercel/blob/client");
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await upload(filename, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload-video",
    multipart: true,
  });
  return blob.url;
}
