"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signInAdmin } from "@/actions/admin-auth";

// 관리자 로그인 — 단일 계정. 성공 시 하드 네비게이션(쿠키 반영, 라이더 폼과 동일 이유).
export function AdminLoginForm() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const valid = id.trim().length > 0 && password.length > 0;

  async function onSubmit() {
    setError(undefined);
    if (!valid) {
      setError("아이디와 비밀번호를 입력해 주세요");
      return;
    }
    setLoading(true);
    try {
      const res = await signInAdmin({ id: id.trim(), password });
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.assign(next && next.startsWith("/admin") ? next : "/admin");
        return;
      }
      setLoading(false);
      setError(res.message);
    } catch {
      setLoading(false);
      setError("로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="app-container flex min-h-dvh flex-col px-5 py-8">
      <div className="flex flex-col gap-3 pt-12">
        <span className="text-caption text-muted-foreground">
          <span aria-hidden="true" className="emoji mr-1">🛵</span>배달장부2 관리자
        </span>
        <h1 className="text-h1 text-foreground">협력사 운영 현황, 한 화면에.</h1>
        <p className="text-body text-muted-foreground">관리자 계정으로 로그인해 전체 라이더 실적을 확인해요.</p>
      </div>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <Field
          label="관리자 아이디"
          autoComplete="username"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <Field
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingLabel="확인하는 중…"
          disabled={!valid}
        >
          로그인
        </Button>
      </form>
    </div>
  );
}
