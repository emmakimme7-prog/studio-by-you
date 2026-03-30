import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export async function POST(request: NextRequest) {
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
}
