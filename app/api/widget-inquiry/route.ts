import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { appendUserMessage, createChatConversation, readChatConversation, updateConversationContact } from "@/lib/chat-inbox";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = String(searchParams.get("conversationId") || "").trim();

  if (!conversationId) {
    return NextResponse.json({ message: "채팅방 정보가 없습니다." }, { status: 400 });
  }

  const conversation = await readChatConversation(conversationId);

  if (!conversation) {
    return NextResponse.json({ message: "채팅방을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      intent?: string;
      name?: string;
      phone?: string;
      message?: string;
      imageDataUrl?: string;
      acceptedPrivacy?: boolean;
    };

    const conversationId = String(body.conversationId || "").trim();
    const intent = String(body.intent || "빠른 문의").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const message = String(body.message || "").trim();
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";
    const acceptedPrivacy = body.acceptedPrivacy === true;

    if (!name || !phone || (!message && !imageDataUrl)) {
      return NextResponse.json({ message: "이름, 연락처와 문의 내용 또는 이미지를 입력해주세요." }, { status: 400 });
    }

    const existingConversation = conversationId ? await readChatConversation(conversationId) : null;
    const needsConsent = !existingConversation || !existingConversation.consentAcceptedAt;

    if (needsConsent && !acceptedPrivacy) {
      return NextResponse.json({ message: "첫 문의 전 개인정보 수집 및 이용 동의가 필요합니다." }, { status: 400 });
    }

    const conversation = conversationId
      ? await appendUserMessage({
          conversationId,
          intent,
          name,
          phone,
          message,
          imageDataUrl: imageDataUrl || undefined,
          consentAcceptedAt: acceptedPrivacy ? new Date().toISOString() : undefined,
        })
      : await createChatConversation({
          intent,
          name,
          phone,
          message,
          imageDataUrl: imageDataUrl || undefined,
          consentAcceptedAt: new Date().toISOString(),
        });

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({
      conversation,
      conversationId: conversation.id,
      message: conversationId
        ? "메시지를 보냈습니다. 답장이 오면 이 창에서 바로 확인할 수 있어요."
        : "채팅이 시작되었습니다. 답장이 오면 이 창에서 바로 확인할 수 있어요.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "채팅 문의 전송 중 문제가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      name?: string;
      phone?: string;
    };

    const conversationId = String(body.conversationId || "").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();

    if (!conversationId) {
      return NextResponse.json({ message: "채팅방 정보가 없습니다." }, { status: 400 });
    }

    if (!name || !phone) {
      return NextResponse.json({ message: "이름과 연락처를 모두 입력해주세요." }, { status: 400 });
    }

    const conversation = await updateConversationContact({
      conversationId,
      name,
      phone,
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({
      conversation,
      message: "입력 정보를 저장했습니다.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "입력 정보 저장 중 문제가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
