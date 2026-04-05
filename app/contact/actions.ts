"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { pushContactInquiry } from "@/lib/site-content";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function submitContactInquiryAction(
  _: { success?: string; error?: string } | undefined,
  formData: FormData,
) {
  try {
    const inquiryType = getField(formData, "inquiryType");
    const plan = getField(formData, "plan");
    const message = getField(formData, "message");
    const name = getField(formData, "name");
    const phone = getField(formData, "phone");
    const attachments = formData
      .getAll("attachments")
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 10);
    const serviceTypes = formData
      .getAll("serviceTypes")
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (!inquiryType || !plan || !name || !phone) {
      return { error: "필수 정보를 모두 입력해주세요." };
    }

    if (!message && attachments.length === 0) {
      return { error: "문의 내용 또는 첨부 이미지를 등록해주세요." };
    }

    await pushContactInquiry({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      inquiryType,
      plan,
      serviceTypes,
      message,
      name,
      phone,
      attachments,
    });
    revalidatePath("/contact");
    revalidatePath("/admin");

    return { success: "문의가 등록되었습니다." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "문의 등록 중 오류가 발생했습니다.";
    return { error: message };
  }
}
