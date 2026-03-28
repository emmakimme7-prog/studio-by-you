import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { appendAdminReply } from "@/lib/chat-inbox";
import { isAuthenticated } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      conversationId?: string;
      message?: string;
    };

    const conversationId = String(body.conversationId || "").trim();
    const message = String(body.message || "").trim();

    if (!conversationId || !message) {
      return NextResponse.json({ message: "답장 내용을 입력해주세요." }, { status: 400 });
    }

    const conversation = await appendAdminReply({ conversationId, message });

    revalidatePath("/admin");
    revalidatePath("/");

    return NextResponse.json({ conversation, message: "답장을 보냈습니다." });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "답장 저장 중 문제가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
