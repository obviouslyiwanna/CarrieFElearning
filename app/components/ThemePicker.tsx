"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const themes = [
  { id: "paper", label: "纸张", color: "#e86e43" },
  { id: "lavender", label: "薰衣草", color: "#a86de8" },
  { id: "mint", label: "薄荷", color: "#2b9d80" },
  { id: "ocean", label: "海盐", color: "#2e91c9" },
] as const;

type ThemeId = (typeof themes)[number]["id"];

export default function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>("paper");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("carriefelearning-theme") as ThemeId | null;
    if (savedTheme && themes.some((item) => item.id === savedTheme)) {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  function changeTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("carriefelearning-theme", nextTheme);
  }

  return (
    <div className="theme-picker" aria-label="选择颜色主题">
      <span className="theme-picker-label">主题</span>
      <div className="theme-picker-options">
        {themes.map((item) => (
          <button
            aria-label={`切换到${item.label}主题`}
            aria-pressed={theme === item.id}
            className={theme === item.id ? "selected" : ""}
            key={item.id}
            onClick={() => changeTheme(item.id)}
            style={{ "--theme-color": item.color } as CSSProperties}
            title={item.label}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
