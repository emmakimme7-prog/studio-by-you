import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_SIZE = 200 * 1024 * 1024; // 200MB

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "업로드 저장소 설정이 누락되었습니다." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기가 너무 큽니다. (최대 200MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Admin upload failed", error);
    const message = error instanceof Error ? error.message : "";
    const isStorageError = /(blob|store|storage|blocked|suspend)/i.test(message);
    return NextResponse.json(
      { error: isStorageError ? "업로드 저장소를 사용할 수 없습니다." : "파일 업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
