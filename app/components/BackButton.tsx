"use client";

import type { ReactNode } from "react";

type BackButtonProps = {
  children: ReactNode;
  className?: string;
};

export default function BackButton({ children, className }: BackButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.assign("/");
        }
      }}
    >
      {children}
    </button>
  );
}
