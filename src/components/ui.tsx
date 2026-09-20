"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import {
  btn,
  btnDanger,
  btnGhost,
  card,
  inputClass,
  labelClass,
} from "./uiServer";

export { btn, btnDanger, btnGhost, card, inputClass, labelClass };

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`${inputClass} ${className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select {...rest} className={`${inputClass} ${className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={`${inputClass} ${className ?? ""}`} />;
}

export function Chip({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  title,
  step,
  right,
}: {
  title: string;
  step?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
        {step ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {step}
          </span>
        ) : null}
        {title}
      </h2>
      {right}
    </div>
  );
}
