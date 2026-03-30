import { NextResponse } from "next/server";
import type { ContactInquiry } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const inquiries: ContactInquiry[] = [
    {
      id: "demo-inquiry-1",
      createdAt: "2026-03-27T01:20:00.000Z",
      plan: "Standard",
      serviceTypes: ["브랜드 소개 사이트", "포트폴리오"],
      message:
        "패션 포트폴리오 사이트를 새로 만들고 싶어요. 메인, 포트폴리오, 문의 페이지 중심으로 2주 안에 오픈 가능한지 궁금합니다.",
      name: "김서윤",
      phone: "010-4821-1934",
      attachments: [],
    },
    {
      id: "demo-inquiry-2",
      createdAt: "2026-03-27T06:45:00.000Z",
      plan: "Deluxe",
      serviceTypes: ["브랜드 홈페이지", "관리자 페이지"],
      message:
        "서비스 소개와 문의 관리가 가능한 사이트가 필요합니다. 직접 텍스트와 이미지를 수정할 수 있는 관리자 페이지도 같이 원해요.",
      name: "박지호",
      phone: "010-7294-5521",
      attachments: [],
    },
    {
      id: "demo-inquiry-3",
      createdAt: "2026-03-28T03:10:00.000Z",
      plan: "Primeum",
      serviceTypes: ["웹앱 MVP", "관리자 페이지"],
      message:
        "초기 MVP를 빠르게 만들고 싶은데 예약 접수와 신청 내역 확인 기능이 꼭 들어가야 합니다. 대략적인 견적 범위 먼저 알고 싶어요.",
      name: "최민재",
      phone: "010-3318-6402",
      attachments: [],
    },
    {
      id: "demo-inquiry-4",
      createdAt: "2026-03-28T11:30:00.000Z",
      plan: "Standard",
      serviceTypes: ["랜딩페이지"],
      message:
        "광고 연결용 랜딩페이지 제작 문의드립니다. 참고 사이트가 있고, 모바일에서 전환이 잘 나오게 구성하고 싶어요.",
      name: "이하린",
      phone: "010-6157-2089",
      attachments: [],
    },
  ];

  return NextResponse.json(inquiries);
}
