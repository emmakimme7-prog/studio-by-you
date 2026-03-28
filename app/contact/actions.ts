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
    const plan = getField(formData, "plan");
    const message = getField(formData, "message");
    const name = getField(formData, "name");
    const phone = getField(formData, "phone");
    const serviceTypes = formData
      .getAll("serviceTypes")
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (!plan || !message || !name || !phone) {
      return { error: "필수 정보를 모두 입력해주세요." };
    }

    await pushContactInquiry({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      plan,
      serviceTypes,
      message,
      name,
      phone,
    });
    revalidatePath("/contact");
    revalidatePath("/admin");

    return { success: "문의가 등록되었습니다." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "문의 등록 중 오류가 발생했습니다.";
    return { error: message };
  }
}
