export async function uploadImageFile(file: File): Promise<string> {
  const { compressClientImage } = await import("@/lib/client-image");
  const dataUrl = await compressClientImage(file);
  const mimeType = dataUrl.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg";
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const compressed = new File([bytes], file.name, { type: mimeType });
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
