"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

type LoginFormProps = {
  defaultPasswordNotice: string | null;
  initialError?: string;
};

export function LoginForm({ defaultPasswordNotice, initialError = "" }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const errorMessage = state?.error || initialError;

  return (
    <form className="auth-form" action={formAction}>
      <label>
        <span>관리자 비밀번호</span>
        <input name="password" type="password" placeholder="비밀번호 입력" required />
      </label>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      <button className="primary-link button-reset" type="submit" disabled={pending}>
        {pending ? "확인 중..." : "관리자 입장"}
      </button>
      {defaultPasswordNotice ? <p className="form-error">기본 관리자 비밀번호가 아직 설정되지 않았습니다.</p> : null}
    </form>
  );
}
