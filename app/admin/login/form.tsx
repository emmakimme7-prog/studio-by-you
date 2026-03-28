"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

type LoginFormProps = {
  defaultPasswordNotice: string | null;
};

export function LoginForm({ defaultPasswordNotice }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form className="auth-form" action={formAction}>
      <label>
        <span>관리자 비밀번호</span>
        <input name="password" type="password" placeholder="비밀번호 입력" required />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <button className="primary-link button-reset" type="submit" disabled={pending}>
        {pending ? "확인 중..." : "관리자 입장"}
      </button>
    </form>
  );
}
