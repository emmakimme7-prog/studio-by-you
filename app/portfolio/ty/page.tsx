import { redirect } from "next/navigation";

const TY_PORTFOLIO_TARGET_URL = process.env.TY_PORTFOLIO_URL || "https://www.teamyezi.kr";

export default function TyPortfolioPage() {
  redirect(TY_PORTFOLIO_TARGET_URL);
}
