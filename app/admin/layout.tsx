import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio by You 관리자",
  description: "Studio by You 관리자 페이지",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
