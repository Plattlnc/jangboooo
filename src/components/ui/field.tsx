"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Alert, Check } from "./icons";
import { Spinner } from "./spinner";

// 01-component-library §G. label + input + helper/error. 본인인증용.
// 에러는 색+아이콘+문구 3중(색 단독 금지), aria-invalid/aria-describedby 연결.

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
  success?: boolean;
  loading?: boolean;
  /** 우측 부가 영역(타이머 등) */
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, helper, error, success, loading, trailing, className, id, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedById = `${inputId}-desc`;
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          disabled={disabled || loading}
          aria-invalid={invalid || undefined}
          aria-describedby={helper || error ? describedById : undefined}
          className={cn(
            "h-12 w-full rounded-md bg-muted px-4 text-body text-foreground",
            "border transition-[border-color,box-shadow] duration-150",
            "placeholder:text-muted-foreground",
            "focus:border-primary focus:shadow-focus focus:outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            invalid ? "border-destructive" : success ? "border-success" : "border-border",
            Boolean(trailing || loading || success || invalid) && "pr-12",
            className,
          )}
          {...props}
        />
        <div className="absolute inset-y-0 right-3 flex items-center gap-2 text-muted-foreground">
          {trailing}
          {loading ? <Spinner size="sm" /> : null}
          {!loading && success ? <Check className="text-success" size={20} /> : null}
          {!loading && invalid ? <Alert className="text-destructive" size={20} /> : null}
        </div>
      </div>
      {error ? (
        <p id={describedById} role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p id={describedById} className="text-caption text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
});
