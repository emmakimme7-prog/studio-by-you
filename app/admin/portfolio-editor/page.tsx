import { PortfolioEditorClient } from "@/app/admin/portfolio-editor/portfolio-editor-client";

type PortfolioEditorPageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

export default async function PortfolioEditorPage({ searchParams }: PortfolioEditorPageProps) {
  const { projectId } = await searchParams;

  return <PortfolioEditorClient projectId={projectId || ""} />;
}
