import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAuthenticated())) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: ALLOWED_VIDEO_TYPES,
          maximumSizeInBytes: 200 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Admin video upload failed", error);
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    const isStorageError = /(blob|store|storage|blocked|suspend)/i.test(message);
    return NextResponse.json(
      { error: isStorageError ? "업로드 저장소를 사용할 수 없습니다." : status === 401 ? "Unauthorized" : "파일 업로드에 실패했습니다." },
      { status },
    );
  }
}
