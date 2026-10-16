"use client";

/*
  HAT — ILC Center öğrenci paneli ve sınav deneyimi prototipi (tek dosya).
  Tokenlar aşağıdaki HAT_CSS içinde CSS değişkeni olarak; düzen Tailwind container
  sorgularıyla (@3xl = 768, @5xl = 1024, @7xl = 1280). Kapsam [data-hat]; üretimde
  [data-panel="student"] kapsamına taşınır. Veriler örnektir, API çağrısı yoktur.
*/

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/* ============================== Tokenlar ============================== */

const HAT_CSS = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Overpass:wght@100..900&family=Overpass+Mono:wght@300..700&family=Source+Serif+4:opsz,wght@8..60,200..900&display=swap");

/* Overpass'ın U+00B7 glifi asimetrik; ayraç noktası sistem fontundan gelir. */
@font-face { font-family: "Hat Dot"; src: local("Helvetica Neue"), local("Helvetica"), local("Arial"), local("Segoe UI"); unicode-range: U+00B7; }

[data-hat] {
  --hat-bg: #FAFAF7;
  --hat-surface: #FFFFFF;
  --hat-surface-raised: #FFFFFF;
  --hat-surface-sunken: #F1F1EC;
  --hat-border: #D9D9D3;
  --hat-border-strong: #8C8C85;
  --hat-scrim: rgb(11 11 12 / 0.56);
  --hat-text-primary: #111111;
  --hat-text-secondary: #55554F;
  --hat-text-tertiary: #6B6B64;
  --hat-accent: #111111;
  --hat-accent-fg: #FFFFFF;
  --hat-accent-hover: #2C2C30;
  --hat-accent-pressed: #000000;
  --hat-signal: #FFD400;
  --hat-signal-fg: #111111;
  --hat-focus-inner: #111111;
  --hat-focus-outer: #FFD400;
  --hat-success: #0B7A42; --hat-success-bg: #E6F4EC;
  --hat-warning: #8F5500; --hat-warning-bg: #FFF3DC;
  --hat-danger: #C4001A;  --hat-danger-bg: #FDE8EA;
  --hat-r-solid: #0057B8; --hat-r-ink: #0057B8; --hat-r-tint: #E6EEF8; --hat-r-on: #FFFFFF;
  --hat-l-solid: #00965E; --hat-l-ink: #007048; --hat-l-tint: #E3F3EB; --hat-l-on: #111111;
  --hat-w-solid: #FF8200; --hat-w-ink: #A34A00; --hat-w-tint: #FFF0E0; --hat-w-on: #111111;
  --hat-s-solid: #DA1884; --hat-s-ink: #B0106A; --hat-s-tint: #FBE7F1; --hat-s-on: #FFFFFF;
  --hat-cefr-a1: #EDECE6; --hat-cefr-a1-fg: #111111;
  --hat-cefr-a2: #DAD8CF; --hat-cefr-a2-fg: #111111;
  --hat-cefr-b1: #BDBAB0; --hat-cefr-b1-fg: #111111;
  --hat-cefr-b2: #6E6C64; --hat-cefr-b2-fg: #FFFFFF;
  --hat-cefr-c1: #45443F; --hat-cefr-c1-fg: #FFFFFF;
  --hat-cefr-c2: #111111; --hat-cefr-c2-fg: #FFD400;

  --hat-scale: 1;
  --hat-content-scale: 1;
  --hat-touch: 48px;
  --hat-line: 4px;
  --hat-gutter: 16px;
  --hat-max: 76rem;
  --hat-r-1: 2px;
  --hat-r-2: 4px;
  --hat-r-3: 8px;
  --hat-elev-1: 0 0 0 1px var(--hat-border);
  --hat-elev-2: 0 0 0 2px var(--hat-border-strong);
  --hat-elev-3: 0 0 0 2px var(--hat-text-primary), 0 24px 48px -12px rgb(0 0 0 / 0.28);

  --hat-font-sans: "Hat Dot", "Overpass", "Segoe UI", system-ui, sans-serif;
  --hat-font-mono: "Overpass Mono", ui-monospace, Menlo, monospace;
  --hat-font-content: "Source Serif 4", Georgia, "Times New Roman", serif;

  --hat-fs-display: calc(2.5rem * var(--hat-scale));   --hat-lh-display: 1.1;  --hat-tr-display: -0.02em;
  --hat-fs-h1: calc(2rem * var(--hat-scale));          --hat-lh-h1: 1.125;     --hat-tr-h1: -0.015em;
  --hat-fs-h2: calc(1.5rem * var(--hat-scale));        --hat-lh-h2: 1.25;      --hat-tr-h2: -0.01em;
  --hat-fs-h3: calc(1.25rem * var(--hat-scale));       --hat-lh-h3: 1.3;       --hat-tr-h3: -0.005em;
  --hat-fs-lead: calc(1.125rem * var(--hat-scale));    --hat-lh-lead: 1.55;
  --hat-fs-body: calc(1rem * var(--hat-scale));        --hat-lh-body: 1.5;
  --hat-fs-label: calc(0.875rem * var(--hat-scale));   --hat-lh-label: 1.43;   --hat-tr-label: 0.01em;
  --hat-fs-code: calc(0.75rem * var(--hat-scale));     --hat-lh-code: 1.33;    --hat-tr-code: 0.06em;

  --hat-content-size: calc(1.25rem * var(--hat-content-scale));
  --hat-content-leading: 1.6;

  --hat-dur-fast: 120ms;
  --hat-dur-base: 200ms;
  --hat-dur-slow: 320ms;
  --hat-ease-out: cubic-bezier(0.2, 0, 0, 1);
  --hat-ease-in: cubic-bezier(0.4, 0, 1, 1);
  --hat-ease-travel: cubic-bezier(0.65, 0, 0.35, 1);
  --hat-travel: 1;
  --hat-celebrate: 1;

  color-scheme: light;
  font-family: var(--hat-font-sans);
  font-size: var(--hat-fs-body);
  line-height: var(--hat-lh-body);
  background: var(--hat-bg);
  color: var(--hat-text-primary);
  -webkit-tap-highlight-color: transparent;
}

[data-hat][data-theme="dark"] {
  --hat-bg: #0B0B0C;
  --hat-surface: #161618;
  --hat-surface-raised: #1F1F22;
  --hat-surface-sunken: #070708;
  --hat-border: #2C2C30;
  --hat-border-strong: #75757A;
  --hat-scrim: rgb(0 0 0 / 0.64);
  --hat-text-primary: #F5F5F0;
  --hat-text-secondary: #A1A19A;
  --hat-text-tertiary: #8A8A84;
  --hat-accent: #FFD400;
  --hat-accent-fg: #111111;
  --hat-accent-hover: #FFE14D;
  --hat-accent-pressed: #E6BF00;
  --hat-focus-inner: #FFD400;
  --hat-focus-outer: #0B0B0C;
  --hat-success: #2FBF71; --hat-success-bg: #0F2A1E;
  --hat-warning: #F2B13B; --hat-warning-bg: #2E230C;
  --hat-danger: #FF6B6F;  --hat-danger-bg: #2E1314;
  --hat-r-solid: #6B9DFF; --hat-r-ink: #6B9DFF; --hat-r-tint: #13223A; --hat-r-on: #111111;
  --hat-l-solid: #2ECC8A; --hat-l-ink: #2ECC8A; --hat-l-tint: #0F2A1E; --hat-l-on: #111111;
  --hat-w-solid: #FF9A3C; --hat-w-ink: #FF9A3C; --hat-w-tint: #2E1D0C; --hat-w-on: #111111;
  --hat-s-solid: #FF5FAE; --hat-s-ink: #FF5FAE; --hat-s-tint: #2E1222; --hat-s-on: #111111;
  --hat-cefr-a1: #2A2A2D; --hat-cefr-a1-fg: #F5F5F0;
  --hat-cefr-a2: #3A3A3E; --hat-cefr-a2-fg: #F5F5F0;
  --hat-cefr-b1: #55555A; --hat-cefr-b1-fg: #F5F5F0;
  --hat-cefr-b2: #8A8A84; --hat-cefr-b2-fg: #111111;
  --hat-cefr-c1: #C9C8C1; --hat-cefr-c1-fg: #111111;
  --hat-cefr-c2: #FFD400; --hat-cefr-c2-fg: #111111;
  --hat-elev-3: 0 0 0 2px var(--hat-border-strong), 0 24px 48px -12px rgb(0 0 0 / 0.6);
  color-scheme: dark;
}

[data-hat][data-mode="exam"] { --hat-dur-slow: var(--hat-dur-base); --hat-celebrate: 0; }
[data-hat][data-mode="exam"]:not([data-theme="dark"]) { --hat-bg: #F7F5EF; --hat-text-primary: #2B2A26; --hat-text-secondary: #5A5850; }
[data-hat][data-mode="exam"][data-theme="dark"] { --hat-bg: #141414; --hat-surface: #1B1B1B; --hat-text-primary: #E8E6DF; --hat-text-secondary: #A3A098; }

[data-hat][data-age="junior"] { --hat-scale: 1.125; --hat-content-scale: 1.2; --hat-touch: 56px; --hat-line: 6px; --hat-r-2: 8px; --hat-r-3: 16px; --hat-content-leading: 1.75; }
[data-hat][data-age="adult"] { --hat-scale: 0.9375; --hat-content-scale: 0.9; --hat-touch: 44px; --hat-line: 3px; }

[data-hat][data-reader-size="s"]  { --hat-content-size: calc(1.125rem * var(--hat-content-scale)); }
[data-hat][data-reader-size="l"]  { --hat-content-size: calc(1.4375rem * var(--hat-content-scale)); }
[data-hat][data-reader-size="xl"] { --hat-content-size: calc(1.625rem * var(--hat-content-scale)); }
[data-hat][data-reader-leading="relaxed"] { --hat-content-leading: 1.8; }
[data-hat][data-reader-leading="loose"]   { --hat-content-leading: 2; }

@container (width >= 48rem) {
  [data-hat] { --hat-gutter: 24px; }
}
@container (width >= 80rem) {
  [data-hat] {
    --hat-gutter: 32px;
    --hat-fs-display: calc(4rem * var(--hat-scale));     --hat-lh-display: 1;
    --hat-fs-h1: calc(2.75rem * var(--hat-scale));       --hat-lh-h1: 1.09;
    --hat-fs-h2: calc(1.875rem * var(--hat-scale));      --hat-lh-h2: 1.2;
    --hat-fs-h3: calc(1.375rem * var(--hat-scale));
    --hat-fs-code: calc(0.8125rem * var(--hat-scale));
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-hat] { --hat-dur-base: 120ms; --hat-dur-slow: 120ms; --hat-ease-travel: linear; --hat-travel: 0; --hat-celebrate: 0; }
}

@keyframes hat-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes hat-dot { 0%, 66%, 100% { opacity: 0.25; } 33% { opacity: 1; } }
@keyframes hat-rise { from { opacity: 0; transform: translateY(calc(var(--hat-travel) * 16px)); } to { opacity: 1; transform: none; } }
@keyframes hat-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hat-arrive { from { left: calc(var(--to) - var(--dist) * var(--hat-travel)); } to { left: var(--to); } }
@keyframes hat-fill { from { width: calc(var(--to) - var(--dist) * var(--hat-travel)); } to { width: var(--to); } }

@layer components {
  [data-hat] .hat-fg { color: var(--hat-text-primary); }
  [data-hat] .hat-fg2 { color: var(--hat-text-secondary); }
  [data-hat] .hat-fg3 { color: var(--hat-text-tertiary); }
  [data-hat] .hat-bg { background-color: var(--hat-bg); }
  [data-hat] .hat-surface { background-color: var(--hat-surface); }
  [data-hat] .hat-raised { background-color: var(--hat-surface-raised); }
  [data-hat] .hat-sunken { background-color: var(--hat-surface-sunken); }
  [data-hat] .hat-bd { border-color: var(--hat-border); }
  [data-hat] .hat-bd-strong { border-color: var(--hat-border-strong); }
  [data-hat] .hat-scrim { background-color: var(--hat-scrim); }

  [data-hat] .hat-card { background-color: var(--hat-surface); border-radius: var(--hat-r-2); box-shadow: var(--hat-elev-1); }
  [data-hat] .hat-card-2 { background-color: var(--hat-surface-raised); border-radius: var(--hat-r-2); box-shadow: var(--hat-elev-2); }
  [data-hat] .hat-press { cursor: pointer; transition: box-shadow var(--hat-dur-fast) var(--hat-ease-out), transform var(--hat-dur-fast) var(--hat-ease-out); }
  [data-hat] .hat-press:hover { box-shadow: var(--hat-elev-2); }
  [data-hat] .hat-press:active { transform: translateY(calc(var(--hat-travel) * 1px)); box-shadow: 0 0 0 2px var(--hat-text-primary); }

  [data-hat] .t-display { font-size: var(--hat-fs-display); line-height: var(--hat-lh-display); letter-spacing: var(--hat-tr-display); font-weight: 900; }
  [data-hat] .t-h1 { font-size: var(--hat-fs-h1); line-height: var(--hat-lh-h1); letter-spacing: var(--hat-tr-h1); font-weight: 800; }
  [data-hat] .t-h2 { font-size: var(--hat-fs-h2); line-height: var(--hat-lh-h2); letter-spacing: var(--hat-tr-h2); font-weight: 800; }
  [data-hat] .t-h3 { font-size: var(--hat-fs-h3); line-height: var(--hat-lh-h3); letter-spacing: var(--hat-tr-h3); font-weight: 700; }
  [data-hat] .t-lead { font-size: var(--hat-fs-lead); line-height: var(--hat-lh-lead); font-weight: 400; }
  [data-hat] .t-body { font-size: var(--hat-fs-body); line-height: var(--hat-lh-body); font-weight: 400; }
  [data-hat] .t-label { font-size: var(--hat-fs-label); line-height: var(--hat-lh-label); letter-spacing: var(--hat-tr-label); font-weight: 600; }
  [data-hat] .t-code { font-family: var(--hat-font-mono); font-size: var(--hat-fs-code); line-height: var(--hat-lh-code); letter-spacing: var(--hat-tr-code); font-weight: 700; text-transform: uppercase; }
  [data-hat] .hat-content { font-family: var(--hat-font-content); font-size: var(--hat-content-size); line-height: var(--hat-content-leading); font-optical-sizing: auto; }
  [data-hat] .hat-num { font-family: var(--hat-font-mono); font-variant-numeric: tabular-nums slashed-zero; }

  [data-hat] .hat-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    min-height: var(--hat-touch); padding: 0 1.25rem; border: 2px solid transparent; border-radius: var(--hat-r-2);
    font-family: var(--hat-font-sans); font-weight: 700; font-size: calc(1rem * var(--hat-scale)); line-height: 1.2;
    white-space: nowrap; cursor: pointer; user-select: none; touch-action: manipulation;
    transition: background-color var(--hat-dur-fast) var(--hat-ease-out), border-color var(--hat-dur-fast) var(--hat-ease-out), color var(--hat-dur-fast) var(--hat-ease-out), transform var(--hat-dur-fast) var(--hat-ease-out);
  }
  [data-hat] .hat-btn:active:not(:disabled) { transform: translateY(calc(var(--hat-travel) * 1px)); }
  [data-hat] .hat-btn-lg { min-height: calc(var(--hat-touch) + 8px); padding: 0 1.75rem; font-size: calc(1.125rem * var(--hat-scale)); }
  [data-hat] .hat-btn-primary { background: var(--hat-accent); color: var(--hat-accent-fg); }
  [data-hat] .hat-btn-primary:hover:not(:disabled) { background: var(--hat-accent-hover); }
  [data-hat] .hat-btn-primary:active:not(:disabled) { background: var(--hat-accent-pressed); }
  [data-hat] .hat-btn-secondary { background: transparent; color: var(--hat-text-primary); border-color: var(--hat-border-strong); }
  [data-hat] .hat-btn-secondary:hover:not(:disabled) { background: var(--hat-surface-sunken); }
  [data-hat] .hat-btn-secondary:active:not(:disabled) { border-color: var(--hat-text-primary); }
  [data-hat] .hat-btn-quiet { background: transparent; color: var(--hat-text-primary); padding: 0 0.75rem; }
  [data-hat] .hat-btn-quiet:hover:not(:disabled) { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
  [data-hat] .hat-btn-quiet:active:not(:disabled) { background: var(--hat-surface-sunken); }
  [data-hat] .hat-btn-danger { background: transparent; color: var(--hat-danger); border-color: var(--hat-danger); }
  [data-hat] .hat-btn-danger:hover:not(:disabled) { background: var(--hat-danger-bg); }
  [data-hat] .hat-btn-danger:active:not(:disabled) { background: var(--hat-danger); color: var(--hat-surface); }
  [data-hat] .hat-btn:disabled { background: var(--hat-surface-sunken); color: var(--hat-text-tertiary); border-color: transparent; cursor: not-allowed; }
  [data-hat] .hat-btn[aria-pressed="true"] { background: var(--hat-signal); color: var(--hat-signal-fg); border-color: var(--hat-text-primary); }

  [data-hat] .hat-icon-btn {
    display: inline-grid; place-items: center; flex-shrink: 0; width: var(--hat-touch); height: var(--hat-touch);
    border-radius: var(--hat-r-2); color: var(--hat-text-primary); cursor: pointer;
    transition: background-color var(--hat-dur-fast) var(--hat-ease-out), transform var(--hat-dur-fast) var(--hat-ease-out);
  }
  [data-hat] .hat-icon-btn:hover:not(:disabled), [data-hat] .hat-icon-btn[aria-expanded="true"] { background: var(--hat-surface-sunken); }
  [data-hat] .hat-icon-btn:active:not(:disabled) { transform: translateY(calc(var(--hat-travel) * 1px)); }
  [data-hat] .hat-icon-btn:disabled { color: var(--hat-text-tertiary); cursor: not-allowed; }

  [data-hat] .hat-input {
    width: 100%; min-height: var(--hat-touch); padding: 0 0.875rem; border: 2px solid var(--hat-border-strong); border-radius: var(--hat-r-1);
    background: var(--hat-surface); color: var(--hat-text-primary); font: inherit;
    transition: border-color var(--hat-dur-fast) var(--hat-ease-out);
  }
  [data-hat] .hat-input:hover { border-color: var(--hat-text-secondary); }
  [data-hat] .hat-input:focus { border-color: var(--hat-text-primary); }
  [data-hat] .hat-input::placeholder { color: var(--hat-text-tertiary); }

  [data-hat] :focus-visible { outline: 3px solid var(--hat-focus-inner); outline-offset: 2px; box-shadow: 0 0 0 2px var(--hat-focus-outer); }
  [data-hat] ::selection { background: var(--hat-signal); color: #111111; }

  [data-hat] .hat-skel { background: var(--hat-surface-sunken); border-radius: var(--hat-r-2); animation: hat-pulse 1.6s var(--hat-ease-travel) infinite; }
  [data-hat] .hat-dots { display: inline-flex; gap: 5px; }
  [data-hat] .hat-dots > i { width: 7px; height: 7px; border-radius: 999px; background: currentColor; opacity: 0.25; animation: hat-dot 960ms linear infinite; }
  [data-hat] .hat-dots > i:nth-child(2) { animation-delay: 320ms; }
  [data-hat] .hat-dots > i:nth-child(3) { animation-delay: 640ms; }
  [data-hat] .hat-rise { animation: hat-rise var(--hat-dur-base) var(--hat-ease-out) both; }
  [data-hat] .hat-fade { animation: hat-fade var(--hat-dur-base) var(--hat-ease-out) both; }
  [data-hat] .hat-arrive { animation: hat-arrive calc(var(--hat-dur-slow) * 2.5 * var(--hat-celebrate)) var(--hat-ease-travel) 450ms both; }
  [data-hat] .hat-fill { animation: hat-fill calc(var(--hat-dur-slow) * 2.5 * var(--hat-celebrate)) var(--hat-ease-travel) 450ms both; }
  [data-hat] .hat-ring-arc { transition: stroke-dashoffset 1s linear; }
  [data-hat] .hat-meter-bar { transition: height 80ms linear, background-color var(--hat-dur-fast) linear; }
}

@media (prefers-reduced-motion: reduce) {
  [data-hat] .hat-skel, [data-hat] .hat-dots > i { animation: none; }
  [data-hat] .hat-dots > i { opacity: 0.6; }
  [data-hat] .hat-ring-arc { transition: none; }
}
`;

/* ============================== Yardımcılar ============================== */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pad = (n: number) => String(n).padStart(2, "0");
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.max(0, s) % 60)}`;
const clock = () =>
  new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

type UiState = "empty" | "loading" | "error" | "success";
type Theme = "light" | "dark";
type Age = "junior" | "teen" | "adult";
type Reader = { size: "s" | "m" | "l" | "xl"; leading: "normal" | "relaxed" | "loose" };
type ScreenId =
  | "today"
  | "journey"
  | "exams"
  | "briefing"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "interrupt"
  | "transition"
  | "finished"
  | "report"
  | "collection"
  | "profile";
type ScreenProps = { state: UiState };

type Skill = "r" | "l" | "w" | "s";
const SKILL_ORDER: Skill[] = ["r", "l", "w", "s"];
const SKILLS: Record<Skill, { name: string; letter: string; shape: string }> = {
  r: { name: "Reading", letter: "R", shape: "Daire" },
  l: { name: "Listening", letter: "L", shape: "Kare" },
  w: { name: "Writing", letter: "W", shape: "Elmas" },
  s: { name: "Speaking", letter: "S", shape: "Altıgen" },
};
const sv = (s: Skill, k: "solid" | "ink" | "tint" | "on") => `var(--hat-${s}-${k})`;

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Level = (typeof LEVELS)[number];
const levelOf = (i: number): Level => LEVELS[Math.min(5, Math.max(0, Math.floor(i / 3)))];
const subOf = (i: number) => `0${(i % 3) + 1}`;
const code = (i: number) => `${levelOf(i)}·${subOf(i)}`;

/* ============================== Veri ============================== */

const STUDENT = { first: "Defne", full: "Defne Arslan", cls: "7-B", school: "İngiliz Kültür Koleji", initials: "DA" };

const POS: Record<Skill, number> = { r: 7, l: 6, w: 5, s: 4 };
const B1_XFER = 6;
const toXfer = (p: number) => Math.max(0, B1_XFER - p);

const CAN_DO: Record<Skill, Record<"A1" | "A2" | "B1" | "B2", string>> = {
  r: {
    A1: "Tabelalarda ve kısa notlarda tanıdık kelimeleri bulursun.",
    A2: "Kısa, günlük metinlerde aradığın bilgiyi bulursun.",
    B1: "Bir makalede ana fikri ve onu destekleyen detayları ayırt edersin.",
    B2: "Uzun metinlerde yazarın görüşünü ve tonunu yorumlarsın.",
  },
  l: {
    A1: "Yavaş söylenen selamlaşma ve sayıları anlarsın.",
    A2: "Yavaş ve net konuşmalarda ana konuyu yakalarsın.",
    B1: "Okul ve günlük yaşamla ilgili konuşmalarda detayları takip edersin.",
    B2: "Hızlı konuşmada fikir ayrılıklarını ve tutumları anlarsın.",
  },
  w: {
    A1: "Kendini birkaç basit cümleyle tanıtırsın.",
    A2: "Kısa mesaj ve notlarda basit bağlaçlarla yazarsın.",
    B1: "Bir deneyimi sırayla ve nedenleriyle anlatan metin yazarsın.",
    B2: "Bir konuda görüşünü savunan, düzenli bir metin yazarsın.",
  },
  s: {
    A1: "Kendini ve aileni kısa cümlelerle tanıtırsın.",
    A2: "Tanıdık konularda kısa cümlelerle konuşursun.",
    B1: "Bir deneyimi başı, ortası ve sonu olan bir anlatıyla aktarırsın.",
    B2: "Bir konuda akıcı biçimde fikir yürütür, karşı görüşe cevap verirsin.",
  },
};
const canDo = (s: Skill, i: number) => {
  const l = levelOf(i);
  return l === "C1" || l === "C2" ? CAN_DO[s].B2 : CAN_DO[s][l];
};

const NEXT_TIP: Record<Skill, string> = {
  r: "Reading'de detay sorularından 8'de en az 6 doğru.",
  l: "Listening'de detay sorularından 5'te en az 4 doğru. Rakam ve saatleri not al.",
  w: "Writing'de 120+ kelime ve en fazla 1 geçmiş zaman hatası.",
  s: "Speaking'de 60 saniyeyi doldur; anlatımını “first, then, finally” ile bağla.",
};

const HISTORY: { label: string; date: string; pos: Record<Skill, number> }[] = [
  { label: "Mar", date: "14 Mart 2026", pos: { r: 5, l: 4, w: 4, s: 3 } },
  { label: "Haz", date: "5 Haziran 2026", pos: { r: 6, l: 5, w: 5, s: 4 } },
  { label: "Eyl", date: "26 Eylül 2026", pos: { r: 7, l: 6, w: 5, s: 4 } },
];

type AvatarCfg = { shape: Skill; color: number; pattern: "none" | "stripes" | "dots" | "grid"; stop: string };
const AVATAR_COLORS: { name: string; bg: string; fg: string }[] = [
  { name: "Gece", bg: "var(--hat-text-primary)", fg: "var(--hat-bg)" },
  { name: "Reading mavisi", bg: "var(--hat-r-solid)", fg: "var(--hat-r-on)" },
  { name: "Listening yeşili", bg: "var(--hat-l-solid)", fg: "var(--hat-l-on)" },
  { name: "Writing turuncusu", bg: "var(--hat-w-solid)", fg: "var(--hat-w-on)" },
  { name: "Speaking pembesi", bg: "var(--hat-s-solid)", fg: "var(--hat-s-on)" },
  { name: "Sinyal sarısı", bg: "var(--hat-signal)", fg: "#111111" },
  { name: "Antrasit", bg: "var(--hat-cefr-c1)", fg: "var(--hat-cefr-c1-fg)" },
  { name: "Taş", bg: "var(--hat-cefr-b1)", fg: "var(--hat-cefr-b1-fg)" },
];
const DEFAULT_AVATAR: AvatarCfg = { shape: "r", color: 0, pattern: "none", stop: "" };
const DEFNE_AVATAR: AvatarCfg = { shape: "s", color: 4, pattern: "stripes", stop: "Moda İskelesi" };

/* ============================== Bağlam ============================== */

type HatCtx = {
  go: (id: ScreenId, st?: UiState) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  reader: Reader;
  setReader: (r: Reader) => void;
  toast: (m: string) => void;
  avatar: AvatarCfg;
  setAvatar: (a: AvatarCfg) => void;
};
const Ctx = createContext<HatCtx | null>(null);
function useHat() {
  const c = useContext(Ctx);
  if (!c) throw new Error("HAT bağlamı yok");
  return c;
}

function useCountdown(initial: number, running = true) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  return s;
}

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])',
        ),
      );
    (focusables()[0] ?? el).focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);
  return ref;
}

/* ============================== İkonlar (Lucide, ISC) ============================== */

const ICONS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </>
  ),
  clipboard: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  ticket: (
    <>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  arrowUp: (
    <>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  play: <path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z" />,
  pause: (
    <>
      <rect x="14" y="4" width="4" height="16" rx="1" />
      <rect x="6" y="4" width="4" height="16" rx="1" />
    </>
  ),
  stop: <rect width="14" height="14" x="5" y="5" rx="2" />,
  mic: (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </>
  ),
  headphones: (
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  ),
  volume: (
    <>
      <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5Z" />
      <path d="M16 9a5 5 0 0 1 0 6" />
      <path d="M19.36 18.36a9 9 0 0 0 0-12.72" />
    </>
  ),
  rotate: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  cloudCheck: (
    <>
      <path d="m17 15-5.5 5.5L9 18" />
      <path d="M5 17.74A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.74" />
    </>
  ),
  cloudOff: (
    <>
      <path d="m2 2 20 20" />
      <path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.19" />
      <path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10 5.07" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M12 20h.01" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
      <path d="M5 12.86a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.86a10 10 0 0 0-2.01-1.52" />
      <path d="M2 8.82a15 15 0 0 1 4.18-2.65" />
      <path d="M22 8.82a15 15 0 0 0-11.29-3.76" />
      <path d="m2 2 20 20" />
    </>
  ),
  grid: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  type: (
    <>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </>
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  device: (
    <>
      <rect width="14" height="20" x="5" y="2" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  monitor: (
    <>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  trendUp: (
    <>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  eye: (
    <>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  bell: (
    <>
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
} satisfies Record<string, ReactNode>;
type IconName = keyof typeof ICONS;

function Icon({ name, size = 20, className, strokeWidth = 2 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cx("shrink-0", className)}
    >
      {ICONS[name]}
    </svg>
  );
}

/* ============================== Temel bileşenler ============================== */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "md" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
};
function Btn({ variant = "secondary", size = "md", icon, iconRight, loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx("hat-btn", `hat-btn-${variant}`, size === "lg" && "hat-btn-lg", className)}
    >
      {loading ? <Dots /> : icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} /> : null}
    </button>
  );
}

function IconBtn({ icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx("hat-icon-btn", className)}>
      <Icon name={icon} size={22} />
    </button>
  );
}

function Dots() {
  return (
    <span className="hat-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Skel({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cx("hat-skel", className)} style={style} />;
}

function Chip({ children, icon, tone }: { children: ReactNode; icon?: IconName; tone?: "success" | "warning" | "signal" }) {
  const style: CSSProperties =
    tone === "success"
      ? { background: "var(--hat-success-bg)", color: "var(--hat-success)" }
      : tone === "warning"
        ? { background: "var(--hat-warning-bg)", color: "var(--hat-warning)" }
        : tone === "signal"
          ? { background: "var(--hat-signal)", color: "var(--hat-signal-fg)", boxShadow: "inset 0 0 0 1.5px #111111" }
          : { boxShadow: "inset 0 0 0 1.5px var(--hat-border-strong)" };
  return (
    <span className="t-label inline-flex min-h-8 items-center gap-1.5 rounded-(--hat-r-1) px-2.5" style={style}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}

const SHAPE: Record<Skill, string> = {
  r: "M32 2a30 30 0 1 1 0 60a30 30 0 1 1 0-60Z",
  l: "M8 3h48a5 5 0 0 1 5 5v48a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z",
  w: "M32 1.5 62.5 32 32 62.5 1.5 32Z",
  s: "M18.5 4h27l15.5 28-15.5 28h-27L3 32Z",
};

function LineBullet({ skill, size = 28, muted = false, halo = false, label }: { skill: Skill; size?: number; muted?: boolean; halo?: boolean; label?: string }) {
  const p = halo ? 8 : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-p} ${-p} ${64 + p * 2} ${64 + p * 2}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0 overflow-visible"
    >
      {halo && <path d={SHAPE[skill]} style={{ fill: "var(--hat-surface)", stroke: "var(--hat-surface)", strokeWidth: 16, strokeLinejoin: "round" }} />}
      <path
        d={SHAPE[skill]}
        style={muted ? { fill: "var(--hat-surface)", stroke: "var(--hat-border-strong)", strokeWidth: 4 } : { fill: sv(skill, "solid") }}
      />
      <text
        x="32"
        y="34"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fill: muted ? "var(--hat-text-secondary)" : sv(skill, "on"),
          fontFamily: "var(--hat-font-sans)",
          fontWeight: 800,
          fontSize: skill === "w" ? 24 : 30,
        }}
      >
        {SKILLS[skill].letter}
      </text>
    </svg>
  );
}

function CefrPlate({ level, sub, size = "m" }: { level: Level; sub?: string; size?: "s" | "m" | "l" | "xl" }) {
  const k = level.toLowerCase();
  const sz = {
    s: "h-7 px-2 text-[13px] hat-num",
    m: "h-9 px-2.5 text-base hat-num",
    l: "h-14 px-3.5 text-[30px] tracking-tight",
    xl: "h-20 px-5 text-[48px] tracking-tight",
  }[size];
  return (
    <span
      className={cx("inline-flex shrink-0 items-center rounded-(--hat-r-1) font-black leading-none", sz)}
      style={{ background: `var(--hat-cefr-${k})`, color: `var(--hat-cefr-${k}-fg)`, boxShadow: "inset 0 0 0 1.5px var(--hat-border-strong)" }}
    >
      {level}
      {sub ? <span className="font-bold opacity-80">·{sub}</span> : null}
    </span>
  );
}

function StationCode({ i, skill }: { i: number; skill?: Skill }) {
  return (
    <span className="hat-num inline-flex items-center gap-1.5 text-[15px] font-bold">
      {skill && <LineBullet skill={skill} size={18} />}
      {code(i)}
    </span>
  );
}

function Avatar({ cfg, size = 48 }: { cfg: AvatarCfg; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = AVATAR_COLORS[cfg.color];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${STUDENT.full} avatarı`} className="shrink-0">
      <defs>
        <clipPath id={`${uid}c`}>
          <path d={SHAPE[cfg.shape]} />
        </clipPath>
        {cfg.pattern === "stripes" && (
          <pattern id={`${uid}p`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="8" style={{ fill: c.fg, opacity: 0.2 }} />
          </pattern>
        )}
        {cfg.pattern === "dots" && (
          <pattern id={`${uid}p`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.6" style={{ fill: c.fg, opacity: 0.25 }} />
          </pattern>
        )}
        {cfg.pattern === "grid" && (
          <pattern id={`${uid}p`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" style={{ fill: "none", stroke: c.fg, opacity: 0.25 }} strokeWidth="1.5" />
          </pattern>
        )}
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        <rect width="64" height="64" style={{ fill: c.bg }} />
        {cfg.pattern !== "none" && <rect width="64" height="64" fill={`url(#${uid}p)`} />}
      </g>
      <text
        x="32"
        y="34"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: c.fg, fontFamily: "var(--hat-font-sans)", fontWeight: 800, fontSize: cfg.shape === "w" ? 18 : 22 }}
      >
        {STUDENT.initials}
      </text>
    </svg>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
  full,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: ReactNode; aria?: string }[];
  label: string;
  full?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (idx + d + options.length) % options.length;
    onChange(options[j].v);
    refs.current[j]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx("hat-sunken gap-1 rounded-(--hat-r-2) p-1", full ? "flex w-full" : "inline-flex")}>
      {options.map((o, idx) => {
        const on = o.v === value;
        return (
          <button
            key={o.v}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.aria}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.v)}
            onKeyDown={(e) => onKey(e, idx)}
            className={cx("t-label min-h-11 flex-1 rounded-(--hat-r-1) px-3", on ? "hat-surface hat-fg font-extrabold" : "hat-fg2")}
            style={on ? { boxShadow: "0 0 0 2px var(--hat-text-primary)" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Ring({ value, size = 200, stroke = 8, children }: { value: number; size?: number; stroke?: number; children: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: "var(--hat-border)" }} />
        <circle
          className="hat-ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ stroke: "var(--hat-text-primary)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

const METER_SHAPE = Array.from({ length: 13 }, (_, i) => 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / 13));
function LevelMeter({ level, tall }: { level: number; tall?: boolean }) {
  const h = tall ? 88 : 64;
  return (
    <div role="meter" aria-label="Ses seviyesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} className="flex items-center justify-center gap-1.5" style={{ height: h }}>
      {METER_SHAPE.map((s, i) => {
        const v = Math.min(1, level * s * 1.5);
        const on = v > 0.18;
        return (
          <span
            key={i}
            className="hat-meter-bar block w-2 rounded-full"
            style={{ height: Math.max(8, v * h), background: on ? sv("s", "solid") : "var(--hat-border-strong)" }}
          />
        );
      })}
    </div>
  );
}

const WAVE = Array.from({ length: 64 }, (_, i) => 0.18 + 0.82 * Math.abs(Math.sin(i * 0.57) * Math.cos(i * 0.21 + 1)));
function Waveform({ progress, label }: { progress: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="flex h-12 items-center gap-[3px]">
      {WAVE.map((h, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="block flex-1 rounded-full"
          style={{ height: `${Math.max(12, h * 100)}%`, background: i / WAVE.length < progress ? "var(--hat-text-primary)" : "var(--hat-border-strong)" }}
        />
      ))}
    </div>
  );
}

function TicketGlyph({ used }: { used: boolean }) {
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true">
      <path
        d="M2 2h30v6a3 3 0 0 0 0 6v6H2v-6a3 3 0 0 0 0-6Z"
        strokeLinejoin="round"
        strokeWidth="2"
        style={used ? { fill: "var(--hat-surface-sunken)", stroke: "var(--hat-border-strong)" } : { fill: "var(--hat-signal)", stroke: "#111111" }}
      />
      {used && <circle cx="17" cy="11" r="4" strokeWidth="2" style={{ fill: "var(--hat-surface)", stroke: "var(--hat-border-strong)" }} />}
    </svg>
  );
}

function EndOfLine() {
  return (
    <svg width="132" height="30" viewBox="0 0 132 30" aria-hidden="true">
      {SKILL_ORDER.map((s, k) => (
        <path key={s} d={`M2 ${4 + k * 7.3}H${104 - k * 6}`} strokeWidth="4" strokeLinecap="round" style={{ stroke: sv(s, "solid") }} />
      ))}
      <path d="M116 2V28" strokeWidth="5" strokeLinecap="round" style={{ stroke: "var(--hat-text-primary)" }} />
    </svg>
  );
}

function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 p-6 @3xl:p-8">
      <EndOfLine />
      <h2 className="t-h2">{title}</h2>
      <p className="t-body hat-fg2 max-w-[36rem]">{body}</p>
      {action}
    </div>
  );
}

function ErrorState({ title, body, reassurance, onRetry, retryLabel = "Tekrar dene" }: { title: string; body: ReactNode; reassurance?: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 p-6 @3xl:p-8">
      <span className="grid size-12 place-items-center rounded-(--hat-r-2)" style={{ background: "var(--hat-warning-bg)", color: "var(--hat-warning)" }}>
        <Icon name="cloudOff" size={24} />
      </span>
      <h2 className="t-h2">{title}</h2>
      <p className="t-body hat-fg2 max-w-[36rem]">{body}</p>
      {reassurance && (
        <p className="t-label flex items-center gap-2" style={{ color: "var(--hat-success)" }}>
          <Icon name="shield" size={18} />
          {reassurance}
        </p>
      )}
      <Btn variant="primary" icon="refresh" onClick={onRetry}>
        {retryLabel}
      </Btn>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center px-4 @5xl:bottom-6 @5xl:justify-start @5xl:pl-[17rem]">
      <div className="hat-rise t-label flex min-h-12 items-center gap-3 rounded-(--hat-r-2) px-4" style={{ background: "var(--hat-text-primary)", color: "var(--hat-bg)", boxShadow: "var(--hat-elev-3)" }}>
        <Icon name="check" size={18} />
        {message}
      </div>
    </div>
  );
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Kapat" tabIndex={-1} className="hat-scrim hat-fade absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="hat-rise hat-surface relative flex max-h-[85%] flex-col rounded-t-(--hat-r-3)"
        style={{ boxShadow: "var(--hat-elev-3)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="hat-bd flex items-center justify-between gap-3 border-b px-5 py-2">
          <h2 className="t-h3">{title}</h2>
          <IconBtn icon="x" label="Kapat" onClick={onClose} />
        </div>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions: ReactNode }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center @3xl:items-center @3xl:p-6">
      <button type="button" aria-label="Kapat" tabIndex={-1} className="hat-scrim hat-fade absolute inset-0" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hat-modal-title"
        tabIndex={-1}
        className="hat-rise hat-surface relative flex max-h-[90%] w-full flex-col gap-5 overflow-y-auto rounded-t-(--hat-r-3) p-6 @3xl:max-w-[35rem] @3xl:rounded-(--hat-r-3) @3xl:p-8"
        style={{ boxShadow: "var(--hat-elev-3)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <h2 id="hat-modal-title" className="t-h2">
          {title}
        </h2>
        <div className="t-body hat-fg2">{children}</div>
        <div className="flex flex-col-reverse gap-3 @3xl:flex-row @3xl:justify-end">{actions}</div>
      </div>
    </div>
  );
}

/* ============================== Panel kabuğu ============================== */

const NAV: { id: ScreenId; label: string; icon: IconName }[] = [
  { id: "today", label: "Bugün", icon: "home" },
  { id: "journey", label: "Yolculuğum", icon: "route" },
  { id: "exams", label: "Sınavlar", icon: "clipboard" },
  { id: "collection", label: "Koleksiyon", icon: "ticket" },
  { id: "profile", label: "Profil", icon: "user" },
];

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="hat-num grid h-9 place-items-center rounded-(--hat-r-1) px-2 text-sm font-bold" style={{ background: "var(--hat-text-primary)", color: "var(--hat-bg)" }}>
        ILC
      </span>
      <span className="t-label hidden @7xl:inline">Center</span>
    </span>
  );
}

function AppShell({ active, children }: { active: ScreenId; children: ReactNode }) {
  const { go, avatar } = useHat();
  return (
    <div className="flex h-full min-h-0 flex-col @5xl:flex-row">
      <nav aria-label="Ana menü" className="hat-surface hat-bd hidden w-26 shrink-0 flex-col gap-1 border-r px-2 py-5 @5xl:flex @7xl:w-64 @7xl:px-4">
        <div className="mb-5 flex justify-center px-2 @7xl:justify-start">
          <Logo />
        </div>
        {NAV.map((n) => {
          const on = n.id === active;
          return (
            <button
              key={n.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => go(n.id)}
              className={cx(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-(--hat-r-2) px-2 py-2 @7xl:flex-row @7xl:justify-start @7xl:gap-3 @7xl:px-3",
                on ? "hat-sunken font-extrabold" : "hat-fg2 font-semibold",
              )}
            >
              {on && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full" style={{ background: "var(--hat-text-primary)" }} />}
              <Icon name={n.icon} size={22} strokeWidth={on ? 2.5 : 2} className={on ? "hat-fg" : undefined} />
              <span className={cx("text-[12px] @7xl:text-[15px]", on && "hat-fg")}>{n.label}</span>
            </button>
          );
        })}
        <div className="mt-auto hidden items-center gap-3 px-2 @7xl:flex">
          <Avatar cfg={avatar} size={40} />
          <div className="min-w-0">
            <p className="t-label truncate">{STUDENT.full}</p>
            <p className="t-code hat-fg2">{STUDENT.cls}</p>
          </div>
        </div>
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-(--hat-max) px-(--hat-gutter) pb-12 pt-5 @3xl:pt-8 @7xl:pt-10">{children}</div>
      </main>
      <nav aria-label="Ana menü" className="hat-surface hat-bd grid shrink-0 grid-cols-5 border-t @5xl:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map((n) => {
          const on = n.id === active;
          return (
            <button
              key={n.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => go(n.id)}
              className={cx("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[12px]", on ? "hat-fg font-extrabold" : "hat-fg2 font-semibold")}
            >
              {on && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[3px] rounded-b" style={{ background: "var(--hat-text-primary)" }} />}
              <Icon name={n.icon} size={22} strokeWidth={on ? 2.5 : 2} />
              {n.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function PageHeader({ kicker, title, lead, right, back }: { kicker?: ReactNode; title: ReactNode; lead?: ReactNode; right?: ReactNode; back?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {back}
        {kicker && <p className="t-code hat-fg2">{kicker}</p>}
        <h1 className="t-h1">{title}</h1>
        {lead && <p className="t-lead hat-fg2 max-w-[42rem]">{lead}</p>}
      </div>
      {right}
    </header>
  );
}

function LineStripe({ height = 6 }: { height?: number }) {
  return (
    <div aria-hidden="true" className="flex" style={{ height }}>
      {SKILL_ORDER.map((s) => (
        <span key={s} className="flex-1" style={{ background: sv(s, "solid") }} />
      ))}
    </div>
  );
}

/* ============================== 1 · Bugün ============================== */

function HeroLines() {
  const C = 520;
  const pts = SKILL_ORDER.map((_, k) => {
    const x = 150 + k * 24;
    const yc = 120 - k * 9.94;
    const t = (C - x - yc) / 2;
    return { x, yc, px: x + t, py: yc + t };
  });
  return (
    <svg aria-hidden="true" viewBox="0 0 420 340" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[44%] @3xl:block">
      {SKILL_ORDER.map((s, k) => (
        <path key={s} d={`M${pts[k].x} -20 V${pts[k].yc} L${pts[k].x + 320} ${pts[k].yc + 320}`} fill="none" strokeWidth="14" strokeLinejoin="round" style={{ stroke: sv(s, "solid") }} />
      ))}
      {SKILL_ORDER.map((s, k) => (
        <circle key={`st${s}`} cx={pts[k].x} cy={52} r="6.5" strokeWidth="3.5" style={{ fill: "var(--hat-surface)", stroke: "var(--hat-text-primary)" }} />
      ))}
      <path d={`M${pts[0].px} ${pts[0].py} L${pts[3].px} ${pts[3].py}`} strokeWidth="26" strokeLinecap="round" style={{ stroke: "var(--hat-text-primary)" }} />
      <path d={`M${pts[0].px} ${pts[0].py} L${pts[3].px} ${pts[3].py}`} strokeWidth="17" strokeLinecap="round" style={{ stroke: "var(--hat-surface)" }} />
      <circle cx={pts[0].x + 52} cy={pts[0].yc + 52} r="12" strokeWidth="3.5" style={{ fill: "var(--hat-signal)", stroke: "#111111" }} />
    </svg>
  );
}

function TodayHero() {
  const { go } = useHat();
  return (
    <section aria-labelledby="today-exam" className="hat-card-2 relative overflow-hidden">
      <LineStripe />
      <HeroLines />
      <div className="relative flex flex-col gap-6 p-6 @3xl:max-w-[60%] @3xl:p-8 @7xl:p-10">
        <p className="t-code flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: "var(--hat-signal)", boxShadow: "0 0 0 2px #111111" }} />
          Şu an açık · 24 Ekim’e kadar
        </p>
        <div>
          <h1 id="today-exam" className="t-display">
            B1 Yolculuk Sınavı
          </h1>
          <p className="t-h3 hat-fg2 mt-3">Ekim · 4 bölüm · 73 dk</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Bölümler: Reading, Listening, Writing, Speaking">
          {SKILL_ORDER.map((s) => (
            <LineBullet key={s} skill={s} size={32} />
          ))}
        </div>
        <div className="flex flex-col items-start gap-3">
          <Btn variant="primary" size="lg" iconRight="arrowRight" onClick={() => go("briefing", "empty")}>
            Sınava başla
          </Btn>
          <p className="t-label hat-fg2">Başlamadan önce kulaklığını ve mikrofonunu birlikte deneyeceğiz.</p>
        </div>
      </div>
    </section>
  );
}

const STREAK = [false, true, true, true, true, true, true, null] as const;
function StreakStrip() {
  return (
    <div className="flex items-end gap-1.5" aria-label="Son 8 hafta: 6 hafta üst üste sefer, bu hafta henüz yok">
      {STREAK.map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="block h-7 flex-1 rounded-(--hat-r-1)"
          style={
            w === null
              ? { boxShadow: "inset 0 0 0 2px var(--hat-text-primary)", backgroundImage: "repeating-linear-gradient(45deg, transparent 0 4px, var(--hat-surface-sunken) 4px 8px)" }
              : w
                ? { background: "var(--hat-text-primary)" }
                : { boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }
          }
        />
      ))}
    </div>
  );
}

function StreakCard() {
  return (
    <article className="hat-card flex flex-col gap-3 p-5">
      <p className="t-code hat-fg2">Sefer serisi</p>
      <p className="t-h1 hat-num">
        6 <span className="t-h3">hafta</span>
      </p>
      <StreakStrip />
      <p className="t-label hat-fg2">Bu hafta bir sınav bitir, seri 7 hafta olsun.</p>
    </article>
  );
}

function MiniLines({ pos }: { pos: Record<Skill, number> }) {
  return (
    <ul className="flex flex-col gap-2">
      {SKILL_ORDER.map((s) => {
        const left = toXfer(pos[s]);
        const pct = Math.max(0, Math.min(1, (pos[s] - 3) / (B1_XFER - 3)));
        return (
          <li key={s} className="flex items-center gap-2">
            <LineBullet skill={s} size={18} />
            <span className="relative block h-1.5 flex-1 overflow-hidden rounded-full hat-sunken">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct * 100}%`, background: sv(s, "solid") }} />
            </span>
            <span className="t-code w-16 text-right">{left === 0 ? "Ulaştı" : `${left} durak`}</span>
          </li>
        );
      })}
    </ul>
  );
}

function LevelCard() {
  const { go } = useHat();
  return (
    <button type="button" onClick={() => go("journey")} className="hat-card hat-press flex flex-col gap-4 p-5 text-left">
      <p className="t-code hat-fg2">Seviyen</p>
      <div className="flex items-center gap-3">
        <CefrPlate level="A2" size="l" />
        <p className="t-h3">
          B1 aktarmasına
          <br />3 durak
        </p>
      </div>
      <MiniLines pos={POS} />
    </button>
  );
}

function LastTripCard() {
  return (
    <article className="hat-card flex flex-col gap-3 p-5">
      <p className="t-code hat-fg2">Son sefer · 26 Eylül</p>
      <p className="t-h3">Reading 1 durak ilerledi</p>
      <div className="flex items-center gap-2">
        <StationCode i={6} skill="r" />
        <Icon name="arrowRight" size={18} className="hat-fg2" />
        <span className="hat-num rounded-(--hat-r-1) px-1.5 text-[15px] font-bold" style={{ background: "var(--hat-signal)", color: "#111111" }}>
          B1·02
        </span>
      </div>
    </article>
  );
}

function TodayScreen({ state }: ScreenProps) {
  const { go, avatar } = useHat();
  return (
    <AppShell active="today">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar cfg={avatar} size={52} />
          <div>
            <p className="t-h3">Merhaba {STUDENT.first}</p>
            <p className="t-label hat-fg2">
              {STUDENT.cls} · {STUDENT.school}
            </p>
          </div>
        </div>
        <p className="t-code hat-fg2">16 Ekim · Cuma</p>
      </div>
      <div className="mt-6 grid gap-4 @5xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] @5xl:gap-6" aria-busy={state === "loading"}>
        {state === "loading" ? (
          <Skel className="h-[24rem]" />
        ) : state === "error" ? (
          <section className="hat-card-2">
            <ErrorState
              title="Sınavların yüklenemedi"
              body="İnternet bağlantını kontrol et. Okul ağı bazen yavaşlar; birkaç saniye sonra tekrar dene."
              reassurance="Yarım kalan bir sınavın varsa cevapların güvende."
              onRetry={() => go("today", "success")}
            />
          </section>
        ) : state === "empty" ? (
          <section className="hat-card-2 overflow-hidden">
            <LineStripe />
            <EmptyState
              title="Şu an açık sınav yok"
              body={
                <>
                  Sıradaki sefer <b className="hat-fg">21 Ekim 09:00</b>: Speaking Pratik · Kısa anlatım. Pratik sınavların sonucu yolculuğuna işlenmez; rahatça dene.
                </>
              }
              action={
                <Btn variant="primary" iconRight="arrowRight" onClick={() => go("journey")}>
                  Yolculuğuna bak
                </Btn>
              }
            />
          </section>
        ) : (
          <TodayHero />
        )}
        <div className="grid gap-4 @3xl:grid-cols-3 @5xl:grid-cols-1">
          {state === "loading" ? (
            [0, 1, 2].map((i) => <Skel key={i} className="h-40" />)
          ) : (
            <>
              <StreakCard />
              <LevelCard />
              <LastTripCard />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ============================== 2 · Yolculuğum ============================== */

type MapCol = { kind: "done" | "st" | "xfer" | "end"; v: number; idx?: number };
const MAP_COLS: MapCol[] = [
  { kind: "done", v: 2 },
  { kind: "st", v: 3, idx: 3 },
  { kind: "st", v: 4, idx: 4 },
  { kind: "st", v: 5, idx: 5 },
  { kind: "xfer", v: 5.5 },
  { kind: "st", v: 6, idx: 6 },
  { kind: "st", v: 7, idx: 7 },
  { kind: "st", v: 8, idx: 8 },
  { kind: "xfer", v: 8.5 },
  { kind: "st", v: 9, idx: 9 },
  { kind: "st", v: 10, idx: 10 },
  { kind: "st", v: 11, idx: 11 },
  { kind: "end", v: 12 },
];
const ZONES: { level: Level; label: string; name: string; from: number; to: number }[] = [
  { level: "A1", label: "A1", name: "Başlangıç", from: 0, to: 0 },
  { level: "A2", label: "A2", name: "Temel", from: 1, to: 3 },
  { level: "B1", label: "B1", name: "Orta", from: 4, to: 7 },
  { level: "B2", label: "B2", name: "Orta üstü", from: 8, to: 11 },
  { level: "C1", label: "C1", name: "İleri", from: 12, to: 12 },
];

function MapCell({ skill, ci, pos, h }: { skill: Skill; ci: number; pos: number; h: boolean }) {
  const col = MAP_COLS[ci];
  const li = SKILL_ORDER.indexOf(skill);
  const inTrav = pos >= col.v;
  const outTrav = ci < MAP_COLS.length - 1 && pos >= MAP_COLS[ci + 1].v;
  const segStyle = (trav: boolean, first: boolean): CSSProperties => ({
    position: "absolute",
    background: sv(skill, "solid"),
    opacity: trav ? 1 : 0.22,
    ...(h
      ? { top: "50%", height: "var(--hat-line)", transform: "translateY(-50%)", width: "50%", ...(first ? { left: 0 } : { right: 0 }) }
      : { left: "50%", width: "var(--hat-line)", transform: "translateX(-50%)", height: "50%", ...(first ? { top: 0 } : { bottom: 0 }) }),
  });
  let node: ReactNode = null;
  if (col.kind === "st" || col.kind === "done") {
    const idx = col.kind === "st" ? col.idx! : 2;
    const isCur = col.kind === "st" ? idx === pos : pos >= 0 && pos <= 2;
    if (isCur) node = <LineBullet skill={skill} size={34} halo />;
    else if (idx < pos)
      node = <span className="block size-3.5 rounded-full" style={{ background: "var(--hat-surface)", boxShadow: `inset 0 0 0 3px ${sv(skill, "solid")}` }} />;
    else node = <span className="block size-3 rounded-full" style={{ background: "var(--hat-surface)", boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }} />;
  } else if (col.kind === "xfer") {
    const first = li === 0;
    const last = li === 3;
    const b = "3px solid var(--hat-text-primary)";
    const style: CSSProperties = h
      ? {
          left: "50%",
          transform: "translateX(-50%)",
          width: 22,
          top: first ? 12 : 0,
          bottom: last ? 12 : 0,
          borderLeft: b,
          borderRight: b,
          borderTop: first ? b : undefined,
          borderBottom: last ? b : undefined,
          borderRadius: `${first ? 11 : 0}px ${first ? 11 : 0}px ${last ? 11 : 0}px ${last ? 11 : 0}px`,
        }
      : {
          top: "50%",
          transform: "translateY(-50%)",
          height: 22,
          left: first ? 10 : 0,
          right: last ? 10 : 0,
          borderTop: b,
          borderBottom: b,
          borderLeft: first ? b : undefined,
          borderRight: last ? b : undefined,
          borderRadius: `${first ? 11 : 0}px ${last ? 11 : 0}px ${last ? 11 : 0}px ${first ? 11 : 0}px`,
        };
    node = (
      <span aria-hidden="true" className="absolute grid place-items-center" style={{ ...style, background: "var(--hat-surface)" }}>
        {pos >= col.v + 0.5 && <span className="block size-2 rounded-full" style={{ background: sv(skill, "solid") }} />}
      </span>
    );
  } else {
    node = <span className="block rounded-full" style={{ background: "var(--hat-border-strong)", ...(h ? { width: 6, height: 22 } : { width: 22, height: 6 }) }} />;
  }
  return (
    <div aria-hidden="true" className="relative z-10 grid place-items-center" style={h ? { gridRow: 3 + li, gridColumn: 2 + ci } : { gridRow: 2 + ci, gridColumn: 3 + li }}>
      {ci > 0 && <span style={segStyle(inTrav, true)} />}
      {ci < MAP_COLS.length - 1 && <span style={segStyle(outTrav, false)} />}
      {col.kind === "xfer" ? node : <span className="relative">{node}</span>}
    </div>
  );
}

function MetroMap({ pos, selected, onSelect, h }: { pos: Record<Skill, number>; selected: Skill | null; onSelect: (s: Skill) => void; h: boolean }) {
  const cols = h
    ? `var(--map-label) ${MAP_COLS.map((c) => (c.kind === "xfer" ? "30px" : "minmax(0,1fr)")).join(" ")}`
    : `56px 40px repeat(4, minmax(0,1fr))`;
  const rows = h ? "auto auto repeat(4, 60px)" : `auto ${MAP_COLS.map((c) => (c.kind === "xfer" ? "30px" : "52px")).join(" ")}`;
  return (
    <div
      className={cx("relative grid", h ? "hidden @3xl:grid [--map-label:56px] @5xl:[--map-label:148px]" : "grid @3xl:hidden")}
      style={{ gridTemplateColumns: cols, gridTemplateRows: rows }}
    >
      {ZONES.map((z, zi) => (
        <div
          key={`band${z.level}`}
          aria-hidden="true"
          className="z-0"
          style={{
            background: zi % 2 ? "var(--hat-surface-sunken)" : "transparent",
            ...(h ? { gridRow: "1 / -1", gridColumn: `${2 + z.from} / ${3 + z.to}` } : { gridColumn: "1 / -1", gridRow: `${2 + z.from} / ${3 + z.to}` }),
          }}
        />
      ))}
      {selected && (
        <div
          aria-hidden="true"
          className="z-0"
          style={{
            background: sv(selected, "tint"),
            ...(h ? { gridColumn: "1 / -1", gridRow: 3 + SKILL_ORDER.indexOf(selected) } : { gridRow: "1 / -1", gridColumn: 3 + SKILL_ORDER.indexOf(selected) }),
          }}
        />
      )}
      {ZONES.map((z) => (
        <div
          key={`zone${z.level}`}
          className={cx("relative z-10 flex min-w-0 gap-2 overflow-hidden p-2 whitespace-nowrap", h ? "items-center" : "flex-col items-start")}
          style={h ? { gridRow: 1, gridColumn: `${2 + z.from} / ${3 + z.to}` } : { gridColumn: 1, gridRow: `${2 + z.from} / ${3 + z.to}` }}
        >
          <CefrPlate level={z.level} size="s" />
          {z.level === "C1" ? <span className="t-code hat-fg2">+C2</span> : null}
          {z.from !== z.to && <span className={cx("t-code hat-fg2", h ? "hidden @5xl:inline" : "hidden")}>{z.name}</span>}
        </div>
      ))}
      {MAP_COLS.map((c, ci) => (
        <div
          key={`code${ci}`}
          aria-hidden="true"
          className="t-code hat-fg3 relative z-10 grid place-items-center py-1"
          style={h ? { gridRow: 2, gridColumn: 2 + ci } : { gridColumn: 2, gridRow: 2 + ci }}
        >
          {c.kind === "st" ? subOf(c.idx!) : c.kind === "done" ? "✓" : c.kind === "xfer" ? "" : "…"}
        </div>
      ))}
      <div
        role="radiogroup"
        aria-label="Hat seç"
        className="contents"
      >
        {SKILL_ORDER.map((s, li) => {
          const on = selected === s;
          return (
            <button
              key={`lab${s}`}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${SKILLS[s].name} hattı: ${pos[s] >= 0 ? `${code(pos[s])} durağında` : "henüz başlamadı"}`}
              onClick={() => onSelect(s)}
              className={cx("relative z-10 flex items-center gap-2 rounded-(--hat-r-1) px-1.5", h ? "justify-start" : "justify-center py-2")}
              style={h ? { gridRow: 3 + li, gridColumn: 1 } : { gridRow: 1, gridColumn: 3 + li }}
            >
              <LineBullet skill={s} size={28} />
              <span className={cx("t-label", h ? "hidden @5xl:inline" : "hidden", on && "font-extrabold")}>{SKILLS[s].name}</span>
            </button>
          );
        })}
      </div>
      {SKILL_ORDER.map((s) => MAP_COLS.map((_, ci) => <MapCell key={`${s}${ci}`} skill={s} ci={ci} pos={pos[s]} h={h} />))}
    </div>
  );
}

function MapLegend() {
  const item = (node: ReactNode, text: string) => (
    <li className="flex items-center gap-2">
      <span className="grid w-8 place-items-center">{node}</span>
      <span className="t-label hat-fg2">{text}</span>
    </li>
  );
  return (
    <ul className="grid gap-x-6 gap-y-2 @3xl:grid-cols-2 @7xl:grid-cols-4">
      {item(<LineBullet skill="r" size={24} />, "Trenin: şu an buradasın")}
      {item(<span className="block size-3.5 rounded-full" style={{ boxShadow: `inset 0 0 0 3px ${sv("r", "solid")}`, background: "var(--hat-surface)" }} />, "Geçtiğin durak")}
      {item(<span className="block size-3 rounded-full" style={{ boxShadow: "inset 0 0 0 2px var(--hat-border-strong)", background: "var(--hat-surface)" }} />, "Sıradaki duraklar")}
      {item(<span className="block h-6 w-3.5 rounded-full" style={{ boxShadow: "inset 0 0 0 3px var(--hat-text-primary)", background: "var(--hat-surface)" }} />, "Aktarma: 4 hat buluşunca seviye açılır")}
    </ul>
  );
}

function LineDetail({ skill }: { skill: Skill }) {
  const { go } = useHat();
  const p = POS[skill];
  return (
    <section className="hat-card-2 flex flex-col gap-5 overflow-hidden" aria-live="polite">
      <div style={{ height: 6, background: sv(skill, "solid") }} />
      <div className="flex flex-col gap-5 px-6 pb-6">
        <div className="flex items-center gap-3">
          <LineBullet skill={skill} size={44} />
          <div>
            <p className="t-code hat-fg2">{SKILLS[skill].name} hattı</p>
            <p className="t-h2">
              <span className="hat-num">{code(p)}</span> durağındasın
            </p>
          </div>
        </div>
        <p className="t-lead">{canDo(skill, p)}</p>
        <div className="hat-sunken flex flex-col gap-1 rounded-(--hat-r-2) p-4">
          <p className="t-code hat-fg2">Sonraki durak · {code(p + 1)}</p>
          <p className="t-body">{NEXT_TIP[skill]}</p>
        </div>
        <Btn variant="primary" className="self-start" iconRight="arrowRight" onClick={() => go("exams")}>
          {skill === "s" ? "Speaking pratiğine bak" : "Sınavlarına bak"}
        </Btn>
      </div>
    </section>
  );
}

function TransferCard() {
  return (
    <section className="hat-card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="block h-9 w-5 rounded-full" style={{ boxShadow: "inset 0 0 0 3px var(--hat-text-primary)" }} />
        <div>
          <p className="t-code hat-fg2">B1 aktarması</p>
          <p className="t-h3">2 / 4 hat ulaştı</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {SKILL_ORDER.map((s) => {
          const left = toXfer(POS[s]);
          return (
            <li key={s} className="flex min-h-10 items-center gap-3">
              <LineBullet skill={s} size={24} />
              <span className="t-body flex-1">{SKILLS[s].name}</span>
              {left === 0 ? (
                <span className="t-label flex items-center gap-1" style={{ color: "var(--hat-success)" }}>
                  <Icon name="check" size={16} />
                  Ulaştı
                </span>
              ) : (
                <span className="t-label hat-fg2">{left} durak</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function JourneyScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const [sel, setSel] = useState<Skill>("s");
  const empty = state === "empty";
  const pos = empty ? { r: -1, l: -1, w: -1, s: -1 } : POS;
  return (
    <AppShell active="journey">
      <PageHeader
        kicker="Yolculuğum"
        title={
          empty ? (
            "Yolculuğun ilk sınavla başlar"
          ) : (
            <span className="flex flex-wrap items-center gap-3">
              Genel seviyen <CefrPlate level="A2" size="l" />
            </span>
          )
        }
        lead={empty ? "İlk sınavın 4 hattın başlangıç durağını belirler. Seviyeni bilmemen sorun değil; sınav seni doğru durağa yerleştirir." : "B1 aktarmasına 3 durak kaldı: Writing 1, Speaking 2 durak. Reading ve Listening aktarmada seni bekliyor."}
      />
      {state === "loading" ? (
        <div className="mt-8 flex flex-col gap-6" aria-busy="true">
          <Skel className="h-[22rem]" />
          <div className="grid gap-6 @5xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Skel className="h-64" />
            <Skel className="h-64" />
          </div>
        </div>
      ) : state === "error" ? (
        <section className="hat-card-2 mt-8">
          <ErrorState title="Haritan yüklenemedi" body="Durak bilgilerin sunucudan gelmedi. Sonuçların silinmedi; yalnızca şu an gösteremiyoruz." onRetry={() => go("journey", "success")} />
        </section>
      ) : (
        <>
          <section aria-label="CEFR metro haritası" className="hat-card mt-8 overflow-hidden">
            <div className="p-3 @3xl:p-5">
              <MetroMap pos={pos} selected={empty ? null : sel} onSelect={setSel} h />
              <MetroMap pos={pos} selected={empty ? null : sel} onSelect={setSel} h={false} />
            </div>
            <div className="hat-bd border-t p-4 @3xl:px-6">
              <MapLegend />
            </div>
          </section>
          {empty ? (
            <section className="hat-card-2 mt-6">
              <EmptyState
                title="Henüz bir durak yok"
                body="Açık sınavını bitirdiğinde trenlerin haritaya yerleşir. Her beceri kendi hızında ilerler."
                action={
                  <Btn variant="primary" iconRight="arrowRight" onClick={() => go("exams")}>
                    İlk sınavına bak
                  </Btn>
                }
              />
            </section>
          ) : (
            <div className="mt-6 grid gap-6 @5xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <LineDetail skill={sel} />
              <TransferCard />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

/* ============================== 3 · Sınav listesi ============================== */

type ExamItem = { id: string; title: string; sub: string; skills: Skill[]; meta: string; when: string; practice?: boolean; res?: Partial<Record<Skill, number>> };
const OPEN: ExamItem[] = [
  { id: "oct", title: "B1 Yolculuk Sınavı", sub: "Ekim", skills: SKILL_ORDER, meta: "4 bölüm · 73 dk", when: "24 Ekim 23:59'a kadar" },
  { id: "lp", title: "Listening Pratik", sub: "Okul duyuruları", skills: ["l"], meta: "1 bölüm · 15 dk", when: "31 Ekim'e kadar", practice: true },
];
const UPCOMING: ExamItem[] = [
  { id: "sp", title: "Speaking Pratik", sub: "Kısa anlatım", skills: ["s"], meta: "3 görev · 12 dk", when: "21 Ekim 09:00'da açılır", practice: true },
  { id: "win", title: "B1 Kış Değerlendirmesi", sub: "Kasım", skills: SKILL_ORDER, meta: "4 bölüm · 80 dk", when: "4 Kasım 09:00'da açılır" },
];
const DONE: ExamItem[] = [
  { id: "sep", title: "B1 Eylül Sınavı", sub: "26 Eylül 2026", skills: SKILL_ORDER, meta: "", when: "", res: { r: 7, l: 6, w: 5, s: 4 } },
  { id: "wp", title: "Writing Pratik", sub: "12 Eylül 2026 · e-posta", skills: ["w"], meta: "", when: "", practice: true, res: { w: 5 } },
  { id: "jun", title: "A2 Seviye Sonu", sub: "5 Haziran 2026", skills: SKILL_ORDER, meta: "", when: "", res: { r: 6, l: 5, w: 5, s: 4 } },
];

function ColumnHead({ icon, title, count, signal }: { icon: IconName; title: string; count: number; signal?: boolean }) {
  return (
    <h2 className="flex items-center gap-2">
      {signal ? (
        <span aria-hidden="true" className="size-3 rounded-full" style={{ background: "var(--hat-signal)", boxShadow: "0 0 0 2px #111111" }} />
      ) : (
        <Icon name={icon} size={18} className="hat-fg2" />
      )}
      <span className="t-h3">{title}</span>
      <span className="hat-num hat-sunken rounded-(--hat-r-1) px-1.5 text-sm font-bold">{count}</span>
    </h2>
  );
}

function PracticeTag() {
  return <span className="t-code hat-fg2 rounded-(--hat-r-1) px-1.5 py-0.5" style={{ boxShadow: "inset 0 0 0 1.5px var(--hat-border-strong)" }}>Pratik</span>;
}

function OpenCard({ e, primary }: { e: ExamItem; primary: boolean }) {
  const { go } = useHat();
  return (
    <article className={cx(primary ? "hat-card-2" : "hat-card", "overflow-hidden")}>
      {primary && <LineStripe height={5} />}
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {e.skills.map((s) => (
            <LineBullet key={s} skill={s} size={24} />
          ))}
          {e.practice && <PracticeTag />}
        </div>
        <div>
          <h3 className="t-h3">{e.title}</h3>
          <p className="t-label hat-fg2 mt-1">
            {e.sub} · {e.meta}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="t-label">{e.when}</span>
          <Btn variant={primary ? "primary" : "secondary"} iconRight="arrowRight" onClick={() => go("briefing", "empty")}>
            Başla
          </Btn>
        </div>
      </div>
    </article>
  );
}

function UpcomingCard({ e }: { e: ExamItem }) {
  const { toast } = useHat();
  const [on, setOn] = useState(false);
  return (
    <article className="hat-sunken flex flex-col gap-4 rounded-(--hat-r-2) p-5">
      <div className="flex flex-wrap items-center gap-2">
        {e.skills.map((s) => (
          <LineBullet key={s} skill={s} size={24} muted />
        ))}
        {e.practice && <PracticeTag />}
      </div>
      <div>
        <h3 className="t-h3">{e.title}</h3>
        <p className="t-label hat-fg2 mt-1">
          {e.sub} · {e.meta}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="t-label flex items-center gap-2">
          <Icon name="lock" size={16} />
          {e.when}
        </span>
        <Btn
          variant="quiet"
          icon="bell"
          aria-pressed={on}
          onClick={() => {
            setOn(!on);
            if (!on) toast(`${e.when.replace("'da açılır", "")}'da hatırlatacağız`);
          }}
        >
          {on ? "Hatırlatılacak" : "Hatırlat"}
        </Btn>
      </div>
    </article>
  );
}

function DoneCard({ e }: { e: ExamItem }) {
  const { go } = useHat();
  return (
    <article className="hat-card flex flex-col gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="t-h3">{e.title}</h3>
          {e.practice && <PracticeTag />}
        </div>
        <p className="t-label hat-fg2 mt-1">{e.sub}</p>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Duraklar">
        {SKILL_ORDER.filter((s) => e.res?.[s] !== undefined).map((s) => (
          <li key={s}>
            <StationCode i={e.res![s]!} skill={s} />
          </li>
        ))}
      </ul>
      {!e.practice && (
        <Btn variant="quiet" className="-ml-3 self-start" iconRight="arrowRight" onClick={() => go("report")}>
          Raporu gör
        </Btn>
      )}
    </article>
  );
}

function ExamsScreen({ state }: ScreenProps) {
  const { go } = useHat();
  return (
    <AppShell active="exams">
      <PageHeader kicker="Sınavlar" title="Seferlerin" lead="Sınavlar belli bir tarihte değil, açık oldukları süre boyunca seni bekler. Hazır olduğunda gir." />
      {state === "loading" ? (
        <div className="mt-8 grid gap-6 @7xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-4">
              <Skel className="h-8 w-40" />
              <Skel className="h-48" />
              <Skel className="h-40" />
            </div>
          ))}
        </div>
      ) : state === "error" ? (
        <section className="hat-card-2 mt-8">
          <ErrorState title="Sınav listesi yüklenemedi" body="Bağlantın geri geldiğinde liste kendiliğinden yenilenir." onRetry={() => go("exams", "success")} />
        </section>
      ) : state === "empty" ? (
        <section className="hat-card-2 mt-8">
          <EmptyState
            title="Henüz sana açılmış bir sınav yok"
            body="Öğretmenin bir sınav açtığında burada ve Bugün ekranında görünecek. Bu sırada profilini kişiselleştirebilirsin."
            action={
              <Btn variant="primary" onClick={() => go("profile")}>
                Profiline git
              </Btn>
            }
          />
        </section>
      ) : (
        <div className="mt-8 grid gap-10 @7xl:grid-cols-3 @7xl:gap-6">
          <section className="flex flex-col gap-4" aria-labelledby="col-open">
            <div id="col-open">
              <ColumnHead icon="clock" title="Açık" count={OPEN.length} signal />
            </div>
            <div className="grid gap-4 @3xl:grid-cols-2 @7xl:grid-cols-1">
              {OPEN.map((e, i) => (
                <OpenCard key={e.id} e={e} primary={i === 0} />
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-4" aria-labelledby="col-up">
            <div id="col-up">
              <ColumnHead icon="calendar" title="Yaklaşan" count={UPCOMING.length} />
            </div>
            <div className="grid gap-4 @3xl:grid-cols-2 @7xl:grid-cols-1">
              {UPCOMING.map((e) => (
                <UpcomingCard key={e.id} e={e} />
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-4" aria-labelledby="col-done">
            <div id="col-done">
              <ColumnHead icon="check" title="Tamamlanan" count={DONE.length} />
            </div>
            <div className="grid gap-4 @3xl:grid-cols-2 @7xl:grid-cols-1">
              {DONE.map((e) => (
                <DoneCard key={e.id} e={e} />
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

/* ============================== 4 · Sınav öncesi brifing ============================== */

type CheckState = "idle" | "running" | "ask" | "ok" | "fail";

function CheckRow({ icon, title, hint, status, children }: { icon: IconName; title: string; hint: ReactNode; status: CheckState; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-(--hat-r-2)"
          style={status === "ok" ? { background: "var(--hat-success-bg)", color: "var(--hat-success)" } : status === "fail" ? { background: "var(--hat-warning-bg)", color: "var(--hat-warning)" } : { background: "var(--hat-surface-sunken)" }}
        >
          <Icon name={status === "ok" ? "check" : status === "fail" ? "alert" : icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-h3">{title}</p>
          <div className="t-body hat-fg2 mt-1">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function BriefingScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const [hp, setHp] = useState<CheckState>(state === "success" ? "ok" : state === "empty" ? "idle" : "ok");
  const [mic, setMic] = useState<CheckState>(state === "success" ? "ok" : state === "loading" ? "running" : state === "error" ? "fail" : "idle");
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (mic !== "running") return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.08;
      setLevel(simLevel(t));
      if (t > 1.8 && state !== "loading") {
        clearInterval(id);
        setMic("ok");
      }
    }, 80);
    return () => clearInterval(id);
  }, [mic, state]);
  useEffect(() => {
    if (hp !== "running") return;
    const id = setTimeout(() => setHp("ask"), 1600);
    return () => clearTimeout(id);
  }, [hp]);
  const ready = hp === "ok" && mic === "ok";
  const sections: { s: Skill; meta: string }[] = [
    { s: "r", meta: "8 soru · 25 dk" },
    { s: "l", meta: "5 soru · 20 dk" },
    { s: "w", meta: "1 görev · 20 dk" },
    { s: "s", meta: "3 görev · 8 dk" },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="hat-surface hat-bd flex h-16 shrink-0 items-center border-b px-2 @3xl:px-(--hat-gutter)">
        <Btn variant="quiet" icon="chevronLeft" onClick={() => go("today")}>
          Bugün
        </Btn>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-(--hat-max) gap-8 px-(--hat-gutter) py-8 @5xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @5xl:gap-12 @7xl:py-12">
          <div className="flex flex-col gap-8">
            <PageHeader kicker="Sınav öncesi" title="B1 Yolculuk Sınavı" lead="Acele yok. Hazır olduğunda başlarsın ve her cevabın anında kaydedilir." />
            <ol className="flex flex-col" aria-label="Bölümler">
              {sections.map(({ s, meta }, i) => (
                <li key={s} className="relative flex items-center gap-4 pb-5 last:pb-0">
                  {i < sections.length - 1 && <span aria-hidden="true" className="absolute left-[17px] top-9 bottom-0 w-1" style={{ background: "var(--hat-border-strong)" }} />}
                  <LineBullet skill={s} size={38} />
                  <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4">
                    <span className="t-h3">{SKILLS[s].name}</span>
                    <span className="t-label hat-fg2 hat-num">{meta}</span>
                  </div>
                </li>
              ))}
            </ol>
            <section aria-labelledby="rules" className="flex flex-col gap-4">
              <h2 id="rules" className="t-h3">
                Bilmen gerekenler
              </h2>
              <ul className="flex flex-col gap-3">
                {(
                  [
                    ["shield", "Cevapların her seçimde kaydedilir. Bağlantı koparsa kaldığın yerden devam edersin."],
                    ["headphones", "Listening kayıtlarını 2 kez dinleyebilirsin. Soruları önceden okuyabilirsin."],
                    ["rotate", "Speaking'de her görev için 1 tekrar hakkın var. Göndermeden önce kendini dinlersin."],
                    ["flag", "Bölüm bitince o bölüme dönemezsin. Bitirmeden önce soru paletine bak."],
                  ] as [IconName, string][]
                ).map(([ic, t]) => (
                  <li key={t} className="flex items-start gap-3">
                    <Icon name={ic} size={20} className="mt-0.5" />
                    <span className="t-body">{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section aria-labelledby="devcheck" className="hat-card-2 flex flex-col self-start p-6 @7xl:sticky @7xl:top-0">
            <h2 id="devcheck" className="t-h2 mb-1">
              Cihaz kontrolü
            </h2>
            <p className="t-body hat-fg2 mb-5">İki kısa deneme. Süren bu ekranda işlemiyor.</p>
            <div className="hat-bd flex flex-col divide-y divide-(--hat-border)">
              <CheckRow
                icon="headphones"
                title="Kulaklık"
                status={hp}
                hint={hp === "ok" ? "Sesi duyuyorsun." : hp === "fail" ? "Ses düzeyini aç; kulaklık takılıysa çıkarıp yeniden tak." : "Kısa bir test sesi çalacağız."}
              >
                {hp === "idle" || hp === "fail" ? (
                  <Btn variant="secondary" icon="play" className="self-start" onClick={() => setHp("running")}>
                    Test sesini çal
                  </Btn>
                ) : hp === "running" ? (
                  <p className="t-label flex items-center gap-2">
                    <Dots /> Çalıyor…
                  </p>
                ) : hp === "ask" ? (
                  <div className="flex flex-wrap gap-3">
                    <Btn variant="primary" icon="check" onClick={() => setHp("ok")}>
                      Duydum
                    </Btn>
                    <Btn variant="secondary" onClick={() => setHp("fail")}>
                      Duymadım
                    </Btn>
                  </div>
                ) : null}
              </CheckRow>
              <CheckRow
                icon="mic"
                title="Mikrofon"
                status={mic}
                hint={
                  mic === "ok" ? (
                    "Ses geliyor. Hazırsın."
                  ) : mic === "fail" ? (
                    <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5">
                      <li>Tarayıcı mikrofon izni istedi ve reddedildi.</li>
                      <li>Adres çubuğundaki kilit simgesine dokun, Mikrofon: İzin ver.</li>
                      <li>Olmazsa öğretmenine haber ver; sınavın bekler.</li>
                    </ol>
                  ) : mic === "running" ? (
                    <>
                      Normal sesinle söyle: <span lang="en" className="hat-content hat-fg">“Hello, my name is…”</span>
                    </>
                  ) : (
                    "Speaking bölümü için sesinin geldiğini görelim."
                  )
                }
              >
                {mic === "running" && (
                  <div className="flex flex-col items-start gap-2">
                    <LevelMeter level={state === "loading" ? 0 : level} />
                    <p className="t-label hat-fg2 flex items-center gap-2">
                      <Dots /> {state === "loading" ? "Mikrofon aranıyor…" : "Dinliyoruz…"}
                    </p>
                  </div>
                )}
                {(mic === "idle" || mic === "fail") && (
                  <Btn variant="secondary" icon="mic" className="self-start" onClick={() => setMic("running")}>
                    {mic === "fail" ? "Tekrar dene" : "Mikrofonu dene"}
                  </Btn>
                )}
              </CheckRow>
            </div>
          </section>
        </div>
      </main>
      <footer className="hat-surface hat-bd flex shrink-0 flex-wrap items-center justify-end gap-3 border-t px-(--hat-gutter) py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {!ready && <p className="t-label hat-fg2 mr-auto">Cihaz kontrolü bitince açılır.</p>}
        <Btn variant="primary" size="lg" iconRight="arrowRight" disabled={!ready} onClick={() => go("reading", "empty")}>
          Sınava başla
        </Btn>
      </footer>
    </div>
  );
}

/* ============================== Sınav kabuğu ============================== */

type Save = { k: "idle" } | { k: "loading" } | { k: "saving" } | { k: "saved"; at: string } | { k: "offline"; n: number };

function SaveIndicator({ save }: { save: Save }) {
  const map: Record<Save["k"], { icon?: IconName; long: string; short: string; warn?: boolean; ok?: boolean }> = {
    idle: { icon: "cloudCheck", long: "Otomatik kayıt açık", short: "Kayıt açık" },
    loading: { long: "Yükleniyor", short: "Yükleniyor" },
    saving: { long: "Kaydediliyor…", short: "Kayıt…" },
    saved: { icon: "cloudCheck", long: `Kaydedildi · ${save.k === "saved" ? save.at : ""}`, short: "Kayıtlı", ok: true },
    offline: { icon: "cloudOff", long: `Çevrimdışı · ${save.k === "offline" ? save.n : 0} cevap bu cihazda`, short: "Cihazda", warn: true },
  };
  const m = map[save.k];
  return (
    <div
      role="status"
      aria-live="polite"
      className="t-label flex min-h-11 items-center gap-2 rounded-(--hat-r-2) px-2.5"
      style={m.warn ? { background: "var(--hat-warning-bg)", color: "var(--hat-warning)" } : undefined}
    >
      {m.icon ? (
        <span style={m.ok ? { color: "var(--hat-success)" } : undefined}>
          <Icon name={m.icon} size={18} />
        </span>
      ) : (
        <Dots />
      )}
      <span className="hidden @3xl:inline">{m.long}</span>
      <span className="@3xl:hidden">{m.short}</span>
    </div>
  );
}

function TimerChip({ seconds, paused }: { seconds: number; paused?: boolean }) {
  const warn = !paused && seconds <= 60;
  return (
    <div
      role="timer"
      aria-label={paused ? "Süre durdu" : `Kalan süre ${Math.floor(seconds / 60)} dakika ${seconds % 60} saniye`}
      className="flex min-h-11 items-center gap-2 rounded-(--hat-r-2) border-2 px-2.5 @3xl:px-3"
      style={{ borderColor: warn ? "var(--hat-warning)" : "var(--hat-border)", color: warn ? "var(--hat-warning)" : undefined }}
    >
      <Icon name={paused ? "pause" : warn ? "alert" : "clock"} size={18} />
      <span className="hat-num text-[17px] font-bold">{mmss(seconds)}</span>
      {paused && <span className="t-label hidden @3xl:inline">durdu</span>}
    </div>
  );
}

function SectionLine({ current, done }: { current: Skill; done: Skill[] }) {
  return (
    <ol className="hidden items-center @3xl:flex" aria-label="Bölümler">
      {SKILL_ORDER.map((s, i) => {
        const isDone = done.includes(s);
        const on = s === current;
        return (
          <li key={s} className="flex items-center">
            {i > 0 && <span aria-hidden="true" className="block h-[3px] w-3" style={{ background: isDone || on ? "var(--hat-text-primary)" : "var(--hat-border-strong)" }} />}
            <LineBullet skill={s} size={on ? 26 : 18} muted={!isDone && !on} />
            <span className="sr-only">
              {SKILLS[s].name}: {isDone ? "tamamlandı" : on ? "şu an" : "sırada"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReaderSettings() {
  const { reader, setReader } = useHat();
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <IconBtn icon="type" label="Okuma ayarları" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div role="dialog" aria-label="Okuma ayarları" className="hat-rise hat-surface absolute right-0 top-[calc(100%+8px)] z-30 flex w-[19rem] flex-col gap-4 rounded-(--hat-r-2) p-4" style={{ boxShadow: "var(--hat-elev-3)" }}>
          <div className="flex flex-col gap-2">
            <p className="t-label">Metin boyutu</p>
            <Seg
              label="Metin boyutu"
              full
              value={reader.size}
              onChange={(size) => setReader({ ...reader, size })}
              options={(["s", "m", "l", "xl"] as const).map((v, i) => ({ v, aria: ["Küçük", "Orta", "Büyük", "Çok büyük"][i], label: <span style={{ fontSize: 13 + i * 3 }}>A</span> }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="t-label">Satır aralığı</p>
            <Seg
              label="Satır aralığı"
              full
              value={reader.leading}
              onChange={(leading) => setReader({ ...reader, leading })}
              options={[
                { v: "normal", label: "Normal" },
                { v: "relaxed", label: "Rahat" },
                { v: "loose", label: "Geniş" },
              ]}
            />
          </div>
          <p lang="en" className="hat-content hat-sunken rounded-(--hat-r-1) p-3">
            A green roof works like a sponge.
          </p>
          <p className="t-label hat-fg2">Yalnızca İngilizce metinleri değiştirir.</p>
        </div>
      )}
    </div>
  );
}

function QuestionPalette({ items, current, onGo }: { items: { n: number; answered: boolean; flagged: boolean }[]; current: number; onGo: (i: number) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cols = 4;
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (d === undefined) return;
    e.preventDefault();
    refs.current[Math.max(0, Math.min(items.length - 1, i + d))]?.focus();
  };
  const answered = items.filter((x) => x.answered).length;
  const flagged = items.filter((x) => x.flagged).length;
  return (
    <div className="flex flex-col gap-5">
      <p className="t-label hat-fg2">
        <b className="hat-fg">{answered}</b> cevaplı · <b className="hat-fg">{flagged}</b> işaretli · <b className="hat-fg">{items.length - answered}</b> boş
      </p>
      <div className="grid grid-cols-4 gap-2 @3xl:grid-cols-8 @7xl:grid-cols-4">
        {items.map((it, i) => {
          const on = i === current;
          return (
            <button
              key={it.n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              onClick={() => onGo(i)}
              onKeyDown={(e) => onKey(e, i)}
              aria-current={on ? "step" : undefined}
              aria-label={`Soru ${it.n}, ${it.answered ? "cevaplandı" : "boş"}${it.flagged ? ", işaretli" : ""}`}
              className="hat-num relative grid aspect-square min-h-11 place-items-center overflow-hidden rounded-(--hat-r-2) text-base font-bold"
              style={{
                background: it.answered ? "var(--hat-text-primary)" : "var(--hat-surface)",
                color: it.answered ? "var(--hat-bg)" : "var(--hat-text-primary)",
                boxShadow: [on ? "0 0 0 2px var(--hat-surface), 0 0 0 5px var(--hat-text-primary)" : "", it.answered ? "" : "inset 0 0 0 2px var(--hat-border-strong)"].filter(Boolean).join(", ") || undefined,
              }}
            >
              {it.n}
              {it.flagged && (
                <svg aria-hidden="true" className="absolute right-0 top-0" width="18" height="18" viewBox="0 0 18 18">
                  <path d="M0 0H18V18Z" strokeWidth="1.5" style={{ fill: "var(--hat-signal)", stroke: "#111111" }} />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <ul className="t-label hat-fg2 flex flex-col gap-2">
        <li className="flex items-center gap-2">
          <span className="block size-5 rounded-(--hat-r-1)" style={{ background: "var(--hat-text-primary)" }} /> Cevaplı
        </li>
        <li className="flex items-center gap-2">
          <span className="block size-5 rounded-(--hat-r-1)" style={{ boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }} /> Boş
        </li>
        <li className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="1" y="1" width="18" height="18" rx="2" strokeWidth="2" style={{ fill: "var(--hat-surface)", stroke: "var(--hat-border-strong)" }} />
            <path d="M8 1H19V12Z" strokeWidth="1.5" style={{ fill: "var(--hat-signal)", stroke: "#111111" }} />
          </svg>
          İşaretli: sonra dön
        </li>
      </ul>
    </div>
  );
}

function ExamFrame({
  skill,
  done,
  step,
  save,
  seconds,
  paused,
  palette,
  paletteLabel,
  footer,
  children,
}: {
  skill: Skill;
  done: Skill[];
  step: string;
  save: Save;
  seconds: number;
  paused?: boolean;
  palette?: (close: () => void) => ReactNode;
  paletteLabel?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { go } = useHat();
  const [sheet, setSheet] = useState(false);
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="hat-surface hat-bd flex h-16 shrink-0 items-center gap-2 border-b px-2 @3xl:gap-4 @3xl:px-(--hat-gutter)">
        <Btn variant="quiet" icon="pause" aria-label="Duraklat" className="min-w-11 px-2 @3xl:px-3" onClick={() => go("interrupt", "empty")}>
          <span className="hidden @3xl:inline">Duraklat</span>
        </Btn>
        <SectionLine current={skill} done={done} />
        <div className="flex min-w-0 items-center gap-2">
          <span className="@3xl:hidden">
            <LineBullet skill={skill} size={22} />
          </span>
          <div className="min-w-0">
            <p className="t-label truncate font-extrabold">{SKILLS[skill].name}</p>
            <p className="t-code hat-fg2 truncate">{step}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 @3xl:gap-2">
          <SaveIndicator save={save} />
          <TimerChip seconds={seconds} paused={paused} />
          <ReaderSettings />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        {palette && (
          <aside aria-label="Soru paleti" className="hat-surface hat-bd hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l p-5 @7xl:flex">
            <h2 className="t-h3">Sorular</h2>
            {palette(() => {})}
          </aside>
        )}
      </div>
      <footer className="hat-surface hat-bd flex shrink-0 items-center gap-2 border-t px-2 py-2 @3xl:px-(--hat-gutter)" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {palette && (
          <Btn variant="secondary" icon="grid" className="@7xl:hidden" onClick={() => setSheet(true)} aria-label={`Sorular ${paletteLabel ?? ""}`}>
            <span className="hat-num">{paletteLabel}</span>
          </Btn>
        )}
        {footer}
      </footer>
      {palette && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Sorular">
          {palette(() => setSheet(false))}
        </Sheet>
      )}
    </div>
  );
}

function OfflineBanner({ n, what = "cevap" }: { n: number; what?: string }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-(--hat-r-2) p-4" style={{ background: "var(--hat-warning-bg)" }}>
      <Icon name="wifiOff" size={22} className="mt-0.5" />
      <div>
        <p className="t-body font-bold">
          Bağlantı yok. {n} {what} bu cihazda saklanıyor.
        </p>
        <p className="t-label hat-fg2 mt-1">Bağlantı gelince kendiliğinden gönderilir. Devam edebilirsin.</p>
      </div>
    </div>
  );
}

function OptionList({ options, value, onChange, label }: { options: [string, string][]; value?: string; onChange: (v: string) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.findIndex((o) => o[0] === value);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + options.length) % options.length;
    onChange(options[j][0]);
    refs.current[j]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-3">
      {options.map(([k, text], i) => {
        const on = value === k;
        return (
          <button
            key={k}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (idx < 0 && i === 0) ? 0 : -1}
            onClick={() => onChange(k)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx("flex min-h-14 w-full items-center gap-4 rounded-(--hat-r-2) p-3 pr-4 text-left", on ? "hat-sunken" : "hat-surface")}
            style={{ boxShadow: on ? "inset 0 0 0 2px var(--hat-text-primary)" : "inset 0 0 0 2px var(--hat-border-strong)", transition: "background-color var(--hat-dur-fast) var(--hat-ease-out)" }}
          >
            <span
              className="hat-num grid size-9 shrink-0 place-items-center rounded-(--hat-r-1) text-base font-bold"
              style={on ? { background: "var(--hat-text-primary)", color: "var(--hat-bg)" } : { boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }}
            >
              {k}
            </span>
            <span lang="en" className="hat-content flex-1">
              {text}
            </span>
            {on && <Icon name="check" size={22} />}
          </button>
        );
      })}
    </div>
  );
}

/* ============================== 5 · Reading ============================== */

type ParaId = "A" | "B" | "C" | "D";
const PASSAGE: { id: ParaId; text: string }[] = [
  {
    id: "A",
    text: "In many crowded cities, there is very little space left for parks. Rotterdam, in the Netherlands, has found an unusual answer: it is looking up. Since 2008, the city has helped owners turn more than 400,000 square metres of flat roofs into gardens, sports fields and even small farms.",
  },
  {
    id: "B",
    text: "The idea started as a way to deal with heavy rain. When storms hit, water runs off hard roofs and floods the streets. A green roof works like a sponge. Its plants and soil hold the water and release it slowly, so the drains have time to cope. Engineers say a single green roof can store up to 30 litres of rain per square metre.",
  },
  {
    id: "C",
    text: "Students at one secondary school took the project further. They now grow tomatoes, herbs and strawberries on their school roof and sell them at a market every Friday. “At first we thought it would be boring,” says 14-year-old Noor. “But when you see something you planted actually grow, you want to come back every day.”",
  },
  {
    id: "D",
    text: "Not everyone is convinced. Some older buildings are not strong enough to carry the weight of wet soil, and adding support can be expensive. Still, the city believes the benefits are worth it: cooler buildings in summer, more space for wildlife and, as Noor puts it, “a reason to look up from your phone.”",
  },
];
const HEADINGS: [string, string][] = [
  ["i", "A problem with the plan"],
  ["ii", "An answer to bad weather"],
  ["iii", "Looking up for space"],
  ["iv", "Learning by growing"],
  ["v", "The cost of new parks"],
];
const ORDER_TEXT: Record<string, string> = {
  c: "The city looks for space for parks.",
  e: "Engineers explain how roofs store rain.",
  m: "Students start selling food at a market.",
  w: "Some people worry about older buildings.",
};
const ORDER_START = ["m", "w", "c", "e"];

type RQ =
  | { kind: "mcq"; para: ParaId; stem: string; options: [string, string][] }
  | { kind: "tfng"; para: ParaId; stem: string }
  | { kind: "gap"; para: ParaId; before: string; after: string }
  | { kind: "match"; para?: undefined }
  | { kind: "order"; para?: undefined };
const READING: RQ[] = [
  {
    kind: "mcq",
    para: "A",
    stem: "According to paragraph A, what has Rotterdam done?",
    options: [
      ["A", "built new parks on empty land"],
      ["B", "helped turn flat roofs into green spaces"],
      ["C", "moved farms out of the city"],
      ["D", "stopped new buildings in the centre"],
    ],
  },
  {
    kind: "mcq",
    para: "B",
    stem: "Why was the green roof idea first introduced?",
    options: [
      ["A", "to make buildings look nicer"],
      ["B", "to give students a place to study"],
      ["C", "to reduce flooding after heavy rain"],
      ["D", "to grow cheap food for the city"],
    ],
  },
  { kind: "tfng", para: "B", stem: "A green roof releases rainwater more slowly than a normal roof." },
  { kind: "tfng", para: "C", stem: "The students sell their vegetables to local restaurants." },
  { kind: "gap", para: "C", before: "The students sell what they grow at a market every", after: "." },
  { kind: "gap", para: "D", before: "Some older buildings cannot carry the", after: "of wet soil." },
  { kind: "match" },
  { kind: "order" },
];
const INSTR: Record<RQ["kind"], string> = {
  mcq: "Metne göre doğru seçeneği seç.",
  tfng: "Bu cümle metne göre doğru mu, yanlış mı, yoksa metinde hiç yok mu?",
  gap: "Boşluğu metindeki tek bir kelimeyle doldur.",
  match: "Her paragrafa uygun başlığı yerleştir. Bir başlık fazla.",
  order: "Cümleleri metinde geçtiği sıraya koy.",
};

type RAns = string | Record<string, string> | string[] | undefined;
const isAnsweredR = (q: RQ, a: RAns) => {
  if (a === undefined) return false;
  if (q.kind === "gap") return typeof a === "string" && a.trim().length > 0;
  if (q.kind === "match") return typeof a === "object" && !Array.isArray(a) && Object.keys(a).length === 4;
  return true;
};

const R_INIT: Record<UiState, { answers: Record<number, RAns>; flags: number[]; cur: number; save: Save }> = {
  empty: { answers: {}, flags: [], cur: 0, save: { k: "idle" } },
  loading: { answers: {}, flags: [], cur: 0, save: { k: "loading" } },
  error: { answers: { 0: "B", 1: "C", 2: "T" }, flags: [], cur: 3, save: { k: "offline", n: 3 } },
  success: { answers: { 0: "B", 1: "C", 2: "T", 3: "F", 4: "Friday", 6: { A: "iii", B: "ii" } }, flags: [3], cur: 1, save: { k: "saved", at: "12:41:08" } },
};

function Passage({ active, cur }: { active?: ParaId; cur: number }) {
  return (
    <article className="mx-auto w-full max-w-[44rem] px-(--hat-gutter) py-6 @7xl:py-8">
      <p className="t-code hat-fg2">Metin · 4 paragraf</p>
      <h2 lang="en" className="mt-2" style={{ fontFamily: "var(--hat-font-content)", fontSize: "calc(var(--hat-content-size) * 1.45)", lineHeight: 1.15, fontWeight: 700 }}>
        The Roof Is the New Park
      </h2>
      <div className="mt-4 flex flex-col gap-1">
        {PASSAGE.map((p) => {
          const on = p.id === active;
          return (
            <section
              key={p.id}
              id={`para-${p.id}`}
              aria-label={`Paragraf ${p.id}`}
              className={cx("grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-(--hat-r-2) py-3 pl-3 pr-3", on && "hat-sunken")}
              style={{ boxShadow: on ? "inset 4px 0 0 var(--hat-text-primary)" : undefined, transition: "background-color var(--hat-dur-base) var(--hat-ease-out)" }}
            >
              <span
                aria-hidden="true"
                className="hat-num mt-1 grid size-8 place-items-center rounded-(--hat-r-1) text-sm font-bold"
                style={on ? { background: "var(--hat-text-primary)", color: "var(--hat-bg)" } : { boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }}
              >
                {p.id}
              </span>
              <div>
                {on && <p className="t-code mb-1">Soru {cur + 1} bu paragrafta</p>}
                <p lang="en" className="hat-content">
                  {p.text}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function Tfng({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const opts: [string, string, string][] = [
    ["T", "True", "Doğru"],
    ["F", "False", "Yanlış"],
    ["NG", "Not Given", "Metinde yok"],
  ];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="radiogroup" aria-label="True, False ya da Not Given" className="grid grid-cols-3 gap-2 @3xl:gap-3">
      {opts.map(([k, en, tr], i) => {
        const on = value === k;
        return (
          <button
            key={k}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (!value && i === 0) ? 0 : -1}
            onClick={() => onChange(k)}
            onKeyDown={(e) => {
              const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const j = (i + d + 3) % 3;
              onChange(opts[j][0]);
              refs.current[j]?.focus();
            }}
            className={cx("flex min-h-20 flex-col items-center justify-center gap-1 rounded-(--hat-r-2) px-2", on ? "" : "hat-surface")}
            style={on ? { background: "var(--hat-text-primary)", color: "var(--hat-bg)" } : { boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }}
          >
            <span lang="en" className="hat-content font-bold" style={{ fontSize: "calc(var(--hat-content-size) * 0.95)", lineHeight: 1.2 }}>
              {en}
            </span>
            <span className="t-label" style={{ opacity: on ? 0.85 : 1, color: on ? undefined : "var(--hat-text-secondary)" }}>
              {tr}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Matcher({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const usedBy = new Map(Object.entries(value).map(([p, h]) => [h, p]));
  const place = (para: ParaId) => {
    if (!pick) return;
    const next = Object.fromEntries(Object.entries(value).filter(([, h]) => h !== pick));
    next[para] = pick;
    onChange(next);
    setPick(null);
  };
  const clear = (para: ParaId) => {
    const next = { ...value };
    delete next[para];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="t-label hat-fg2 mb-2">1 · Bir başlık seç</p>
        <ul className="flex flex-col gap-2">
          {HEADINGS.map(([id, text]) => {
            const at = usedBy.get(id);
            const on = pick === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPick(on ? null : id)}
                  className={cx("flex min-h-12 w-full items-center gap-3 rounded-(--hat-r-2) px-3 py-2 text-left", on ? "hat-sunken" : "hat-surface")}
                  style={{ boxShadow: on ? "inset 0 0 0 3px var(--hat-text-primary)" : "inset 0 0 0 2px var(--hat-border-strong)" }}
                >
                  <span className="hat-num w-8 shrink-0 text-sm font-bold">{id}</span>
                  <span lang="en" className="hat-content flex-1" style={{ fontSize: "calc(var(--hat-content-size) * 0.9)" }}>
                    {text}
                  </span>
                  {at && (
                    <span className="t-code shrink-0 rounded-(--hat-r-1) px-1.5 py-0.5" style={{ background: "var(--hat-text-primary)", color: "var(--hat-bg)" }}>
                      → {at}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="t-label hat-fg2 mb-2">2 · Paragrafa yerleştir</p>
        <ul className="grid gap-2 @3xl:grid-cols-2 @5xl:grid-cols-1 @7xl:grid-cols-2">
          {(["A", "B", "C", "D"] as ParaId[]).map((p) => {
            const hId = value[p];
            const text = HEADINGS.find((x) => x[0] === hId)?.[1];
            return (
              <li key={p} className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => place(p)}
                  aria-label={`Paragraf ${p}: ${text ?? "boş"}${pick ? ". Seçili başlığı buraya yerleştir." : ""}`}
                  className="flex min-h-14 flex-1 items-center gap-3 rounded-(--hat-r-2) px-3 text-left"
                  style={hId ? { boxShadow: "inset 0 0 0 2px var(--hat-text-primary)" } : { border: `2px dashed ${pick ? "var(--hat-text-primary)" : "var(--hat-border-strong)"}` }}
                >
                  <span className="hat-num grid size-8 shrink-0 place-items-center rounded-(--hat-r-1) text-sm font-bold" style={{ background: "var(--hat-text-primary)", color: "var(--hat-bg)" }}>
                    {p}
                  </span>
                  {text ? (
                    <span lang="en" className="hat-content flex-1" style={{ fontSize: "calc(var(--hat-content-size) * 0.9)" }}>
                      {text}
                    </span>
                  ) : (
                    <span className="t-label hat-fg2 flex-1">{pick ? "Buraya yerleştir" : "Boş"}</span>
                  )}
                </button>
                {hId && <IconBtn icon="x" label={`Paragraf ${p} başlığını kaldır`} onClick={() => clear(p)} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Orderer({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    requestAnimationFrame(() => refs.current[next[j]]?.focus());
  };
  return (
    <ol className="flex flex-col gap-2">
      {value.map((id, i) => (
        <li
          key={id}
          ref={(el) => {
            refs.current[id] = el;
          }}
          tabIndex={0}
          aria-label={`${i + 1}. sıra: ${ORDER_TEXT[id]}. Taşımak için Alt ve yukarı ya da aşağı ok.`}
          onKeyDown={(e) => {
            if (!e.altKey) return;
            if (e.key === "ArrowUp") {
              e.preventDefault();
              move(i, -1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(i, 1);
            }
          }}
          className="hat-surface flex min-h-14 items-center gap-3 rounded-(--hat-r-2) py-1 pl-3 pr-1"
          style={{ boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }}
        >
          <span className="hat-num grid size-8 shrink-0 place-items-center rounded-(--hat-r-1) text-sm font-bold" style={{ background: "var(--hat-text-primary)", color: "var(--hat-bg)" }}>
            {i + 1}
          </span>
          <span lang="en" className="hat-content flex-1" style={{ fontSize: "calc(var(--hat-content-size) * 0.9)" }}>
            {ORDER_TEXT[id]}
          </span>
          <IconBtn icon="arrowUp" label="Yukarı taşı" disabled={i === 0} onClick={() => move(i, -1)} />
          <IconBtn icon="arrowDown" label="Aşağı taşı" disabled={i === value.length - 1} onClick={() => move(i, 1)} />
        </li>
      ))}
    </ol>
  );
}

function ReadingScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const init = R_INIT[state];
  const [answers, setAnswers] = useState<Record<number, RAns>>(init.answers);
  const [flags, setFlags] = useState<number[]>(init.flags);
  const [cur, setCur] = useState(init.cur);
  const [view, setView] = useState<"text" | "question">("question");
  const [save, setSave] = useState<Save>(init.save);
  const [confirm, setConfirm] = useState(false);
  const seconds = useCountdown(18 * 60 + 42, state !== "loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textRef = useRef<HTMLDivElement>(null);
  const q = READING[cur];
  const flagged = flags.includes(cur);
  const items = READING.map((qq, i) => ({ n: i + 1, answered: isAnsweredR(qq, answers[i]), flagged: flags.includes(i) }));
  const answeredCount = items.filter((x) => x.answered).length;

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const setAnswer = (i: number, v: RAns) => {
    const next = { ...answers, [i]: v };
    setAnswers(next);
    if (state === "error") {
      setSave({ k: "offline", n: READING.filter((qq, j) => isAnsweredR(qq, next[j])).length });
      return;
    }
    setSave({ k: "saving" });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSave({ k: "saved", at: clock() }), 450);
  };

  const scrollToPara = (para?: ParaId) => {
    if (!para) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        textRef.current?.querySelector(`#para-${para}`)?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "nearest",
        }),
      ),
    );
  };
  const goQ = (i: number) => {
    setCur(i);
    setView("question");
    scrollToPara(READING[i].para);
  };

  useEffect(() => {
    if (q.kind !== "mcq") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable='true']") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      const i = "ABCD".includes(k) && k.length === 1 ? "ABCD".indexOf(k) : "1234".indexOf(k);
      if (i < 0 || i >= q.options.length) return;
      e.preventDefault();
      setAnswer(cur, q.options[i][0]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const answerUi = () => {
    const a = answers[cur];
    switch (q.kind) {
      case "mcq":
        return <OptionList label={q.stem} options={q.options} value={a as string | undefined} onChange={(v) => setAnswer(cur, v)} />;
      case "tfng":
        return <Tfng value={a as string | undefined} onChange={(v) => setAnswer(cur, v)} />;
      case "gap":
        return (
          <p lang="en" className="hat-content">
            {q.before}{" "}
            <input
              aria-label="Boşluk"
              value={(a as string | undefined) ?? ""}
              onChange={(e) => setAnswer(cur, e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className="hat-sunken mx-1 inline-block min-h-11 w-[9ch] rounded-t-(--hat-r-1) border-b-[3px] px-2 align-baseline outline-offset-2"
              style={{ borderColor: "var(--hat-text-primary)", fontFamily: "var(--hat-font-content)", fontSize: "var(--hat-content-size)", fontWeight: 600 }}
            />{" "}
            {q.after}
          </p>
        );
      case "match":
        return <Matcher value={(a as Record<string, string> | undefined) ?? {}} onChange={(v) => setAnswer(cur, v)} />;
      case "order":
        return <Orderer value={(a as string[] | undefined) ?? ORDER_START} onChange={(v) => setAnswer(cur, v)} />;
    }
  };

  const stem = q.kind === "mcq" || q.kind === "tfng" ? q.stem : null;
  const last = cur === READING.length - 1;

  return (
    <ExamFrame
      skill="r"
      done={[]}
      step={`Soru ${cur + 1} / ${READING.length}`}
      save={save}
      seconds={seconds}
      paletteLabel={`${answeredCount}/${READING.length}`}
      palette={(close) => (
        <>
          <QuestionPalette
            items={items}
            current={cur}
            onGo={(i) => {
              goQ(i);
              close();
            }}
          />
          <Btn variant="secondary" className="mt-2 w-full" onClick={() => setConfirm(true)}>
            Reading’i bitir
          </Btn>
        </>
      )}
      footer={
        state === "loading" ? (
          <div className="ml-auto flex gap-2">
            <Btn variant="primary" disabled>
              Sonraki
            </Btn>
          </div>
        ) : (
          <>
            <Btn
              variant="secondary"
              icon="flag"
              aria-pressed={flagged}
              aria-label={flagged ? "İşareti kaldır" : "İşaretle, sonra dön"}
              onClick={() => setFlags((f) => (f.includes(cur) ? f.filter((x) => x !== cur) : [...f, cur]))}
            >
              <span className="hidden @3xl:inline">{flagged ? "İşaretli" : "İşaretle"}</span>
            </Btn>
            <div className="ml-auto flex gap-2">
              <Btn variant="secondary" icon="chevronLeft" disabled={cur === 0} aria-label="Önceki soru" onClick={() => goQ(cur - 1)}>
                <span className="hidden @3xl:inline">Önceki</span>
              </Btn>
              {last ? (
                <Btn variant="primary" onClick={() => setConfirm(true)}>
                  Bölümü bitir
                </Btn>
              ) : (
                <Btn variant="primary" iconRight="chevronRight" onClick={() => goQ(cur + 1)}>
                  Sonraki
                </Btn>
              )}
            </div>
          </>
        )
      }
    >
      {state === "loading" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-(--hat-gutter) @5xl:grid @5xl:grid-cols-2 @5xl:gap-10" aria-busy="true">
          <div className="flex flex-col gap-3">
            <Skel className="h-5 w-32" />
            <Skel className="h-9 w-3/4" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skel key={i} className="h-4" style={{ width: `${92 - (i % 3) * 9}%` }} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Skel className="h-5 w-40" />
            <Skel className="h-7 w-full" />
            {[0, 1, 2, 3].map((i) => (
              <Skel key={i} className="h-14" />
            ))}
            <p className="t-label hat-fg2 flex items-center gap-2">
              <Dots /> Sorular hazırlanıyor. Süren başlamadı.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col @5xl:grid @5xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @5xl:grid-rows-[minmax(0,1fr)]">
          <div className="hat-surface hat-bd shrink-0 border-b px-3 py-2 @5xl:hidden">
            <Seg
              label="Görünüm"
              full
              value={view}
              onChange={setView}
              options={[
                { v: "text", label: "Metin" },
                { v: "question", label: `Soru ${cur + 1} / ${READING.length}` },
              ]}
            />
          </div>
          <div ref={textRef} className={cx("hat-bd min-h-0 flex-1 overflow-y-auto @5xl:block @5xl:border-r-2", view === "text" ? "block" : "hidden")}>
            <Passage active={q.para} cur={cur} />
          </div>
          <div className={cx("min-h-0 flex-1 overflow-y-auto @5xl:block", view === "question" ? "block" : "hidden")}>
            <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-5 px-(--hat-gutter) py-6 @7xl:py-8">
              {state === "error" && <OfflineBanner n={save.k === "offline" ? save.n : 3} />}
              <div className="flex flex-wrap items-center gap-2">
                <span className="t-code hat-fg2">
                  Soru {cur + 1} / {READING.length}
                  {q.para ? ` · Paragraf ${q.para}` : " · Tüm metin"}
                </span>
                {flagged && (
                  <Chip tone="signal" icon="flag">
                    İşaretli
                  </Chip>
                )}
                {q.kind === "mcq" && <span className="t-code hat-fg3 ml-auto hidden @7xl:inline">Kısayol: A–D</span>}
              </div>
              <p className="t-lead">{INSTR[q.kind]}</p>
              {stem && (
                <p lang="en" className="hat-content font-semibold">
                  {stem}
                </p>
              )}
              {answerUi()}
              {q.para && (
                <Btn
                  variant="quiet"
                  icon="eye"
                  className="-ml-3 self-start @5xl:hidden"
                  onClick={() => {
                    setView("text");
                    scrollToPara(q.para);
                  }}
                >
                  Metinde göster · Paragraf {q.para}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reading'i bitiriyor musun?"
        actions={
          <>
            <Btn variant="secondary" onClick={() => setConfirm(false)}>
              Sorulara dön
            </Btn>
            <Btn variant="primary" onClick={() => go("transition", "success")}>
              Bölümü bitir
            </Btn>
          </>
        }
      >
        <p>
          <b className="hat-fg">{answeredCount}</b> cevaplı, <b className="hat-fg">{READING.length - answeredCount}</b> boş, <b className="hat-fg">{flags.length}</b> işaretli soru var.
        </p>
        <p className="mt-2">Bitirince bu bölüme geri dönemezsin. Cevapların kayıtlı.</p>
      </Modal>
    </ExamFrame>
  );
}

/* ============================== 6 · Listening ============================== */

const LISTEN_QS: { stem: string; options: [string, string][] }[] = [
  { stem: "Where is the class going on the trip?", options: [["A", "the science museum"], ["B", "the city aquarium"], ["C", "a farm outside the city"]] },
  { stem: "What time does the bus leave school?", options: [["A", "8:15"], ["B", "8:30"], ["C", "8:50"]] },
  { stem: "What does Ms Carter ask everyone to bring?", options: [["A", "a packed lunch"], ["B", "a notebook and a pen"], ["C", "money for the gift shop"]] },
  { stem: "Why can't Leo go on Thursday?", options: [["A", "He has a dentist appointment."], ["B", "He is playing in a football match."], ["C", "He is visiting his grandmother."]] },
  { stem: "How will students get their tickets?", options: [["A", "from the school office"], ["B", "by email from Ms Carter"], ["C", "at the museum entrance"]] },
];
const AUDIO_LEN = 84;

type AudioStatus = "ready" | "loading" | "error" | "playing";
function AudioPlayer({ status, elapsed, used, max, onPlay, onRetry }: { status: AudioStatus; elapsed: number; used: number; max: number; onPlay: () => void; onRetry: () => void }) {
  const left = max - used;
  const playing = status === "playing";
  return (
    <div className="hat-card-2 flex flex-col gap-4 p-4 @3xl:p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPlay}
          disabled={status !== "ready" || left <= 0}
          aria-label={playing ? "Kayıt çalıyor" : `Kaydı dinle. ${left} dinleme hakkın kaldı.`}
          className="hat-btn hat-btn-primary shrink-0"
          style={{ width: 60, height: 60, padding: 0, borderRadius: 999 }}
        >
          {status === "loading" ? <Dots /> : <Icon name={playing ? "volume" : "play"} size={26} />}
        </button>
        <div className="min-w-0 flex-1">
          <Waveform progress={elapsed / AUDIO_LEN} label="Kayıt ilerlemesi" />
          <div className="t-code hat-fg2 mt-1 flex justify-between">
            <span>{mmss(Math.floor(elapsed))}</span>
            <span>{mmss(AUDIO_LEN)}</span>
          </div>
        </div>
      </div>
      {status === "loading" && (
        <p className="t-label flex items-center gap-2">
          <Dots /> Ses hazırlanıyor · %64. Hazırlanırken hakkın kullanılmaz.
        </p>
      )}
      {status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-(--hat-r-2) p-3" style={{ background: "var(--hat-warning-bg)" }}>
          <p className="t-body">
            <b>Ses yüklenemedi.</b> Dinleme hakkın kullanılmadı.
          </p>
          <Btn variant="secondary" icon="refresh" onClick={onRetry}>
            Yeniden yükle
          </Btn>
        </div>
      )}
      <div className="hat-bd flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: max }, (_, i) => (
              <TicketGlyph key={i} used={i < used} />
            ))}
          </span>
          <span className="t-label">{left > 0 ? `${left} dinleme hakkın kaldı` : "Dinleme hakkın bitti"}</span>
        </div>
        <span className="t-label hat-fg2">{playing ? "Kayıt sonuna kadar çalar" : "Başlayınca duraklatılamaz"}</span>
      </div>
    </div>
  );
}

function ListeningScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const [status, setStatus] = useState<AudioStatus>(state === "loading" ? "loading" : state === "error" ? "error" : "ready");
  const [used, setUsed] = useState(state === "success" ? 1 : 0);
  const [elapsed, setElapsed] = useState(state === "success" ? AUDIO_LEN : 0);
  const [answers, setAnswers] = useState<Record<number, string>>(state === "success" ? { 0: "A", 1: "B" } : {});
  const [flags, setFlags] = useState<number[]>([]);
  const [cur, setCur] = useState(state === "success" ? 2 : 0);
  const [save, setSave] = useState<Save>(state === "success" ? { k: "saved", at: "12:49:30" } : { k: "idle" });
  const seconds = useCountdown(16 * 60 + 5, state !== "loading");
  const q = LISTEN_QS[cur];
  const items = LISTEN_QS.map((_, i) => ({ n: i + 1, answered: answers[i] !== undefined, flagged: flags.includes(i) }));
  const answeredCount = items.filter((x) => x.answered).length;

  useEffect(() => {
    if (status !== "playing") return;
    let e = 0;
    const id = setInterval(() => {
      e += 0.25;
      setElapsed(e);
      if (e >= AUDIO_LEN) {
        clearInterval(id);
        setStatus("ready");
      }
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  const pick = (v: string) => {
    setAnswers((a) => ({ ...a, [cur]: v }));
    setSave({ k: "saving" });
    setTimeout(() => setSave({ k: "saved", at: clock() }), 450);
  };

  return (
    <ExamFrame
      skill="l"
      done={["r"]}
      step={`Soru ${cur + 1} / ${LISTEN_QS.length}`}
      save={state === "loading" ? { k: "loading" } : save}
      seconds={seconds}
      paletteLabel={`${answeredCount}/${LISTEN_QS.length}`}
      palette={(close) => (
        <QuestionPalette
          items={items}
          current={cur}
          onGo={(i) => {
            setCur(i);
            close();
          }}
        />
      )}
      footer={
        <>
          <Btn variant="secondary" icon="flag" aria-pressed={flags.includes(cur)} aria-label="İşaretle, sonra dön" onClick={() => setFlags((f) => (f.includes(cur) ? f.filter((x) => x !== cur) : [...f, cur]))}>
            <span className="hidden @3xl:inline">{flags.includes(cur) ? "İşaretli" : "İşaretle"}</span>
          </Btn>
          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" icon="chevronLeft" aria-label="Önceki soru" disabled={cur === 0} onClick={() => setCur(cur - 1)}>
              <span className="hidden @3xl:inline">Önceki</span>
            </Btn>
            {cur === LISTEN_QS.length - 1 ? (
              <Btn variant="primary" onClick={() => go("writing", "success")}>
                Bölümü bitir
              </Btn>
            ) : (
              <Btn variant="primary" iconRight="chevronRight" onClick={() => setCur(cur + 1)}>
                Sonraki
              </Btn>
            )}
          </div>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[72rem] gap-6 px-(--hat-gutter) py-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @5xl:items-start @5xl:gap-10 @7xl:py-8">
          <div className="flex flex-col gap-4 @5xl:sticky @5xl:top-0">
            <p className="t-code hat-fg2">Kayıt 1 / 1 · 5 soru</p>
            <p className="t-lead">Konuşmayı dinle ve her soru için doğru seçeneği seç.</p>
            <p lang="en" className="hat-content">
              You will hear a teacher, Ms Carter, talking to her class about a school trip.
            </p>
            <AudioPlayer
              status={status}
              elapsed={elapsed}
              used={used}
              max={2}
              onPlay={() => {
                setUsed((u) => u + 1);
                setElapsed(0);
                setStatus("playing");
              }}
              onRetry={() => setStatus("ready")}
            />
            <p className="t-label hat-fg2 flex items-start gap-2">
              <Icon name="info" size={18} />
              Soruları dinlemeden önce okuyabilirsin. Cevaplarını kayıt çalarken de seçebilirsin.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="t-code hat-fg2">
                Soru {cur + 1} / {LISTEN_QS.length}
              </span>
              {flags.includes(cur) && (
                <Chip tone="signal" icon="flag">
                  İşaretli
                </Chip>
              )}
            </div>
            <p lang="en" className="hat-content font-semibold">
              {q.stem}
            </p>
            <OptionList label={q.stem} options={q.options} value={answers[cur]} onChange={pick} />
          </div>
        </div>
      </div>
    </ExamFrame>
  );
}

/* ============================== 7 · Writing ============================== */

const WRITING_SAMPLE =
  "If a visitor came to my town, I would take them to the old harbour first. Early in the morning, the fishing boats come back and the whole place smells of salt and fresh bread from the bakery on the corner. My grandfather used to bring me here when I was little, so it feels special to me. Visitors can walk along the sea wall, watch the boats and try simit with tea at one of the small cafés. In the evening, the lights from the boats shine on the water and it looks amazing. I think it shows the real character of my town better than any shopping centre.";

function WordMeter({ count }: { count: number }) {
  const max = 200;
  const pct = Math.min(1, count / max);
  const inRange = count >= 100 && count <= 150;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-3 rounded-full hat-sunken" role="meter" aria-label="Kelime sayısı" aria-valuemin={0} aria-valuemax={max} aria-valuenow={count}>
        <span aria-hidden="true" className="absolute inset-y-0 rounded-full" style={{ left: "50%", width: "25%", boxShadow: "inset 0 0 0 2px var(--hat-text-primary)" }} />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct * 100}%`, background: inRange ? "var(--hat-success)" : "var(--hat-text-primary)", opacity: 0.85 }} />
      </div>
      <div className="t-label flex flex-wrap items-center justify-between gap-2">
        <span>
          <b className="hat-num text-[17px]">{count}</b> kelime <span className="hat-fg2">· hedef 100–150</span>
        </span>
        <span style={{ color: inRange ? "var(--hat-success)" : count > 150 ? "var(--hat-warning)" : "var(--hat-text-secondary)" }}>
          {count === 0 ? "Yazmaya başla" : count < 100 ? `100'e ${100 - count} kelime kaldı` : inRange ? "Hedef aralıktasın" : "150'yi geçtin, kısaltmayı düşün"}
        </span>
      </div>
    </div>
  );
}

function WritingScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const [text, setText] = useState(state === "success" || state === "error" ? WRITING_SAMPLE : "");
  const [save, setSave] = useState<Save>(state === "success" ? { k: "saved", at: "12:56:12" } : state === "error" ? { k: "offline", n: 1 } : state === "loading" ? { k: "loading" } : { k: "idle" });
  const [noteGone, setNoteGone] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const seconds = useCountdown(5 * 60 + 6, state !== "loading");
  const t1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    },
    [],
  );
  const onType = (v: string) => {
    setText(v);
    if (state === "error") return;
    clearTimeout(t1.current);
    clearTimeout(t2.current);
    t1.current = setTimeout(() => {
      setSave({ k: "saving" });
      t2.current = setTimeout(() => setSave({ k: "saved", at: clock() }), 400);
    }, 900);
  };
  const count = wordCount(text);
  const showNote = seconds <= 300 && !noteGone && state !== "loading";
  const draftLabel = save.k === "saved" ? `Taslak kaydedildi · ${save.at}` : save.k === "saving" ? "Kaydediliyor…" : save.k === "offline" ? "Taslak bu cihazda saklandı" : "Taslağın birkaç saniyede bir kaydedilir";

  return (
    <ExamFrame
      skill="w"
      done={["r", "l"]}
      step="Görev 1 / 1"
      save={save}
      seconds={seconds}
      footer={
        <div className="ml-auto flex items-center gap-3">
          <span className="t-label hat-fg2 hidden @3xl:inline">{draftLabel}</span>
          <Btn variant="primary" disabled={state === "loading"} onClick={() => setConfirm(true)}>
            Writing’i bitir
          </Btn>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[76rem] gap-6 px-(--hat-gutter) py-6 @5xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] @5xl:gap-10 @7xl:py-8">
          <section aria-labelledby="w-task" className="flex flex-col gap-4 @5xl:sticky @5xl:top-0 @5xl:self-start">
            <p className="t-code hat-fg2">Görev · 100–150 kelime</p>
            <p className="t-lead">Okul dergisi için kısa bir yazı yaz.</p>
            <div lang="en" className="hat-card flex flex-col gap-3 p-5">
              <h2 id="w-task" className="hat-content font-bold">
                A place I would show a visitor
              </h2>
              <p className="hat-content">Your school magazine wants articles with this title. Write about a place in your town or city.</p>
              <p className="hat-content">In your article, say:</p>
              <ul className="hat-content flex list-disc flex-col gap-1 pl-6">
                <li>where the place is</li>
                <li>why it is special to you</li>
                <li>what a visitor can do there</li>
              </ul>
            </div>
          </section>
          <section aria-label="Yazma alanı" className="flex min-h-0 flex-col gap-4">
            {state === "error" && <OfflineBanner n={1} what="taslak" />}
            {showNote && (
              <div role="status" className="hat-rise flex items-start gap-3 rounded-(--hat-r-2) p-4" style={{ boxShadow: "inset 0 0 0 2px var(--hat-text-primary)" }}>
                <Icon name="clock" size={22} className="mt-0.5" />
                <p className="t-body flex-1">
                  <b>5 dakikan kaldı.</b> Taslağın kayıtlı; son cümlelerine odaklan.
                </p>
                <Btn variant="quiet" onClick={() => setNoteGone(true)}>
                  Tamam
                </Btn>
              </div>
            )}
            {state === "loading" ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                <Skel className="h-[22rem]" />
                <p className="t-label hat-fg2 flex items-center gap-2">
                  <Dots /> Taslağın geri yükleniyor…
                </p>
              </div>
            ) : (
              <>
                <textarea
                  lang="en"
                  aria-label="Yazın (İngilizce)"
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Yazmaya başla. Taslağın birkaç saniyede bir kaydedilir."
                  className="hat-input hat-content min-h-[20rem] resize-none p-5 @5xl:min-h-[28rem]"
                  style={{ fontSize: "var(--hat-content-size)", lineHeight: "var(--hat-content-leading)" }}
                />
                <WordMeter count={count} />
                <p className="t-label hat-fg2 flex items-center gap-2 @3xl:hidden">
                  <Icon name={save.k === "offline" ? "cloudOff" : "cloudCheck"} size={16} />
                  {draftLabel}
                </p>
              </>
            )}
          </section>
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Writing'i bitiriyor musun?"
        actions={
          <>
            <Btn variant="secondary" onClick={() => setConfirm(false)}>
              Yazmaya dön
            </Btn>
            <Btn variant="primary" onClick={() => go("speaking", "empty")}>
              Bitir ve Speaking’e geç
            </Btn>
          </>
        }
      >
        <p>
          Yazın <b className="hat-fg">{count} kelime</b>. Hedef 100–150. Bitirince bu bölüme dönemezsin.
        </p>
      </Modal>
    </ExamFrame>
  );
}

/* ============================== 8 · Speaking ============================== */

type SPhase = "check" | "checkErr" | "prep" | "count" | "rec" | "review" | "sent";
const S_INIT: Record<UiState, SPhase> = { empty: "check", loading: "prep", error: "checkErr", success: "review" };
const PHASE_LEN = { prep: 30, count: 3, rec: 60 };
function simLevel(t: number) {
  const v = 0.12 + 0.6 * Math.abs(Math.sin(t * 3.1)) * (0.6 + 0.4 * Math.sin(t * 0.9)) + 0.18 * Math.abs(Math.sin(t * 11.3));
  return Math.max(0, Math.min(1, v));
}

function SpeakingScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const [phase, setPhase] = useState<SPhase>(S_INIT[state]);
  const [heard, setHeard] = useState(false);
  const [left, setLeft] = useState(PHASE_LEN.prep);
  const [level, setLevel] = useState(0);
  const [retries, setRetries] = useState(1);
  const [recLen, setRecLen] = useState(52);
  const [playT, setPlayT] = useState<number | null>(null);
  const checking = phase === "check" || phase === "checkErr";
  const seconds = useCountdown(7 * 60 + 12, !checking);

  useEffect(() => {
    if (phase !== "check" && phase !== "rec") return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.08;
      setLevel(simLevel(t));
    }, 80);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "check") return;
    const id = setTimeout(() => setHeard(true), 1800);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "prep" && phase !== "count" && phase !== "rec") return;
    let v = PHASE_LEN[phase];
    const id = setInterval(() => {
      v -= 1;
      if (v > 0) {
        setLeft(v);
        return;
      }
      clearInterval(id);
      if (phase === "prep") {
        setPhase("count");
        setLeft(PHASE_LEN.count);
      } else if (phase === "count") {
        setPhase("rec");
        setLeft(PHASE_LEN.rec);
      } else {
        setRecLen(PHASE_LEN.rec);
        setPhase("review");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const playing = playT !== null;
  useEffect(() => {
    if (!playing) return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.25;
      if (t >= recLen) {
        clearInterval(id);
        setPlayT(null);
        return;
      }
      setPlayT(t);
    }, 250);
    return () => clearInterval(id);
  }, [playing, recLen]);

  const startPrep = () => {
    setLeft(PHASE_LEN.prep);
    setPhase("prep");
  };
  const startCount = () => {
    setLeft(PHASE_LEN.count);
    setPhase("count");
  };
  const stopRec = () => {
    setRecLen(Math.max(1, PHASE_LEN.rec - left));
    setPhase("review");
  };

  const footer = (() => {
    switch (phase) {
      case "check":
        return (
          <>
            {!heard && <span className="t-label hat-fg2">Ses gelince açılır.</span>}
            <Btn variant="primary" size="lg" className="ml-auto" disabled={!heard} iconRight="arrowRight" onClick={startPrep}>
              Hazırlanmaya başla
            </Btn>
          </>
        );
      case "checkErr":
        return (
          <>
            <span className="t-label hat-fg2">Mikrofon duyulunca devam edersin.</span>
            <Btn
              variant="primary"
              size="lg"
              className="ml-auto"
              icon="refresh"
              onClick={() => {
                setHeard(false);
                setPhase("check");
              }}
            >
              Tekrar dene
            </Btn>
          </>
        );
      case "prep":
        return (
          <Btn variant="primary" size="lg" className="ml-auto" icon="mic" onClick={startCount}>
            Hazırım, kayda geç
          </Btn>
        );
      case "count":
        return (
          <Btn variant="primary" size="lg" className="ml-auto" disabled>
            Kayıt başlıyor…
          </Btn>
        );
      case "rec":
        return (
          <Btn variant="primary" size="lg" className="ml-auto" icon="stop" onClick={stopRec}>
            Kaydı bitir
          </Btn>
        );
      case "review":
        return (
          <>
            {retries > 0 && (
              <Btn
                variant="secondary"
                icon="rotate"
                onClick={() => {
                  setRetries(0);
                  setPlayT(null);
                  startCount();
                }}
              >
                <span className="hidden @3xl:inline">Yeniden kaydet</span>
                <span className="@3xl:hidden">Yeniden</span>
              </Btn>
            )}
            <Btn variant="primary" size="lg" className="ml-auto" iconRight="arrowRight" onClick={() => setPhase("sent")}>
              Gönder
            </Btn>
          </>
        );
      case "sent":
        return (
          <Btn variant="primary" size="lg" className="ml-auto" iconRight="arrowRight" onClick={() => go("finished", "success")}>
            Devam et
          </Btn>
        );
    }
  })();

  const panel = (() => {
    switch (phase) {
      case "check":
        return (
          <>
            <p className="t-code hat-fg2">Adım 1 / 3 · Mikrofon testi</p>
            <h2 className="t-h2">Önce mikrofonunu deneyelim</h2>
            <p className="t-body hat-fg2">
              Normal sesinle söyle:{" "}
              <span lang="en" className="hat-content hat-fg">
                “Hello, I&apos;m ready.”
              </span>
            </p>
            <LevelMeter level={level} tall />
            {heard ? (
              <Chip tone="success" icon="check">
                Ses geliyor
              </Chip>
            ) : (
              <span className="t-label hat-fg2 flex items-center gap-2">
                <Dots /> Ses bekleniyor…
              </span>
            )}
            <p className="t-label hat-fg3 flex items-center gap-2">
              <Icon name="mic" size={16} /> Dahili mikrofon · Süren bu adımda işlemiyor
            </p>
          </>
        );
      case "checkErr":
        return (
          <>
            <p className="t-code hat-fg2">Adım 1 / 3 · Mikrofon testi</p>
            <h2 className="t-h2">Sesin henüz gelmiyor</h2>
            <LevelMeter level={0} tall />
            <ul className="t-body flex max-w-[26rem] flex-col gap-2 text-left">
              <li className="flex gap-2">
                <span className="hat-num font-bold">1</span> Mikrofon sessize alınmış olabilir; klavyedeki sessiz tuşuna bak.
              </li>
              <li className="flex gap-2">
                <span className="hat-num font-bold">2</span> Kulaklık kullanıyorsan çıkarıp yeniden tak.
              </li>
              <li className="flex gap-2">
                <span className="hat-num font-bold">3</span> Olmazsa öğretmenine haber ver. Süren işlemiyor, acele yok.
              </li>
            </ul>
          </>
        );
      case "prep":
        return (
          <>
            <p className="t-code hat-fg2">Adım 2 / 3 · Hazırlık</p>
            <Ring value={left / PHASE_LEN.prep} size={184}>
              <span className="hat-num t-h1">{mmss(left)}</span>
              <span className="t-label hat-fg2">hazırlık</span>
            </Ring>
            <p className="t-body hat-fg2 max-w-[24rem]">Ne öğrendin, kim yardım etti, nasıl hissettin: kafanda sırala. Süre bitince 3 saniyelik geri sayımla kayıt başlar.</p>
          </>
        );
      case "count":
        return (
          <>
            <p className="t-code hat-fg2">Kayıt başlıyor</p>
            <p aria-live="assertive" className="hat-num font-bold leading-none" style={{ fontSize: "calc(6rem * var(--hat-scale))" }}>
              {left}
            </p>
            <p className="t-body hat-fg2">Hazır olduğunda konuşmaya başla.</p>
          </>
        );
      case "rec":
        return (
          <>
            <p className="t-code flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: sv("s", "solid") }} />
              Kaydediliyor
            </p>
            <Ring value={left / PHASE_LEN.rec} size={184}>
              <span className="hat-num t-h1">{mmss(left)}</span>
              <span className="t-label hat-fg2">kalan</span>
            </Ring>
            <LevelMeter level={level} />
            <p className="t-label hat-fg2">Düşünmek için durabilirsin; kısa sessizlikler sorun değil.</p>
          </>
        );
      case "review":
        return (
          <>
            <p className="t-code hat-fg2">Adım 3 / 3 · Kendini dinle</p>
            <h2 className="t-h2">Kaydın hazır · {mmss(recLen)}</h2>
            <div className="flex w-full max-w-[28rem] items-center gap-4">
              <button
                type="button"
                onClick={() => setPlayT(playing ? null : 0)}
                aria-label={playing ? "Durdur" : "Kaydını dinle"}
                className="hat-btn hat-btn-secondary shrink-0"
                style={{ width: 56, height: 56, padding: 0, borderRadius: 999 }}
              >
                <Icon name={playing ? "pause" : "play"} size={24} />
              </button>
              <div className="min-w-0 flex-1">
                <Waveform progress={(playT ?? 0) / recLen} label="Kaydın" />
              </div>
            </div>
            <p className="t-body max-w-[26rem]">{retries > 0 ? "1 tekrar hakkın var. Kullanmazsan bu kayıt gönderilir." : "Tekrar hakkını kullandın. Bu kayıt gönderilecek."}</p>
          </>
        );
      case "sent":
        return (
          <>
            <span className="grid size-16 place-items-center rounded-full" style={{ background: "var(--hat-success-bg)", color: "var(--hat-success)" }}>
              <Icon name="shield" size={32} />
            </span>
            <h2 className="t-h2">Kaydın gönderildi</h2>
            <p className="t-body hat-fg2 max-w-[26rem]">Değerlendirme sınav bitince yapılır. Sonucunu raporunda göreceksin.</p>
          </>
        );
    }
  })();

  return (
    <ExamFrame skill="s" done={["r", "l", "w"]} step="Görev 2 / 3" save={phase === "sent" ? { k: "saved", at: "13:04:51" } : { k: "idle" }} seconds={seconds} paused={checking} footer={footer}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[76rem] gap-6 px-(--hat-gutter) py-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @5xl:gap-10 @7xl:py-8">
          <section aria-labelledby="s-task" className="hat-card flex flex-col gap-4 self-start p-5 @3xl:p-6">
            <div className="flex items-center gap-3">
              <LineBullet skill="s" size={36} />
              <div>
                <p className="t-code hat-fg2">Görev 2 / 3</p>
                <h2 id="s-task" className="t-h3">
                  Kısa anlatım
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip icon="clock">30 sn hazırlık</Chip>
              <Chip icon="mic">1 dk konuşma</Chip>
              <Chip icon="rotate">{retries > 0 ? "1 tekrar hakkı" : "Tekrar hakkı kullanıldı"}</Chip>
            </div>
            <div lang="en" className="hat-sunken flex flex-col gap-3 rounded-(--hat-r-2) p-4">
              <p className="hat-content font-semibold">Talk about a time you learned something new outside school.</p>
              <p className="hat-content">You should say:</p>
              <ul className="hat-content flex list-disc flex-col gap-1 pl-6">
                <li>what you learned</li>
                <li>who helped you</li>
                <li>how you felt about it</li>
              </ul>
              <p className="hat-content">and explain why it was important to you.</p>
            </div>
            <p className="t-label hat-fg2 flex items-start gap-2">
              <Icon name="info" size={18} />
              Hata yapman sorun değil. Değerlendirme, anlattığının anlaşılır olmasına bakar.
            </p>
          </section>
          <section aria-label="Kayıt" aria-live="polite" className="hat-card-2 flex min-h-[24rem] flex-col items-center justify-center gap-5 p-6 text-center @3xl:p-8">
            {panel}
          </section>
        </div>
      </div>
    </ExamFrame>
  );
}

/* ============================== 9 · Duraklatma / bağlantı / cihaz ============================== */

function InterruptScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const variants: Record<UiState, { icon: IconName; title: string; body: ReactNode; actions: ReactNode }> = {
    empty: {
      icon: "pause",
      title: "Sınavı duraklattın",
      body: "Süren durdu: 18:42 kaldı. Sınav 24 Ekim 23:59'a kadar açık; istersen çıkıp sonra devam edebilirsin.",
      actions: (
        <>
          <Btn variant="secondary" icon="logout" onClick={() => go("today")}>
            Sonra devam et
          </Btn>
          <Btn variant="primary" size="lg" icon="play" onClick={() => go("reading", "success")}>
            Devam et
          </Btn>
        </>
      ),
    },
    loading: {
      icon: "wifiOff",
      title: "Bağlantı koptu. Yeniden bağlanıyoruz…",
      body: (
        <>
          Bir şey yapmana gerek yok. Süren bağlantı gelene kadar durdu. Son 2 cevabın bu cihazda saklanıyor; bağlantı gelince gönderilecek.
          <span className="t-label hat-fg mt-4 flex items-center gap-2">
            <Dots /> Deneme 3 · birkaç saniye
          </span>
        </>
      ),
      actions: null,
    },
    error: {
      icon: "monitor",
      title: "Sınavın başka bir cihazda açıldı",
      body: "Bu cihazda devam edersen diğer cihazdaki oturum kapanır. Cevapların iki durumda da kayıtlı.",
      actions: (
        <>
          <Btn variant="secondary" onClick={() => go("today")}>
            Bu ben değilim
          </Btn>
          <Btn variant="primary" size="lg" icon="device" onClick={() => go("interrupt", "success")}>
            Bu cihazda devam et
          </Btn>
        </>
      ),
    },
    success: {
      icon: "cloudCheck",
      title: "Yeniden bağlandın",
      body: "2 cevabın gönderildi. Süren kaldığı yerden devam edecek.",
      actions: (
        <Btn variant="primary" size="lg" iconRight="arrowRight" onClick={() => go("reading", "success")}>
          Soru 7’den devam et
        </Btn>
      ),
    },
  };
  const v = variants[state];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="hat-surface hat-bd flex h-16 shrink-0 items-center gap-3 border-b px-(--hat-gutter)">
        <LineBullet skill="r" size={22} />
        <p className="t-label truncate">B1 Yolculuk Sınavı · Reading</p>
      </header>
      <main className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-(--hat-gutter)">
        <section role="alertdialog" aria-labelledby="saved-title" aria-describedby="int-body" className="hat-card-2 hat-fade flex w-full max-w-[36rem] flex-col gap-6 p-6 @3xl:p-10">
          <div className="flex items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full" style={{ background: "var(--hat-success-bg)", color: "var(--hat-success)" }}>
              <Icon name="shield" size={34} />
            </span>
            <div>
              <h1 id="saved-title" className="t-h1">
                Cevapların kayıtlı.
              </h1>
              <p className="t-body hat-fg2 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="hat-num">Son kayıt 12:41:08</span>
                <span className="flex items-center gap-1.5">
                  <LineBullet skill="r" size={16} /> 6 / 8
                </span>
              </p>
            </div>
          </div>
          <div className="hat-bd flex items-start gap-3 border-t pt-6">
            <Icon name={v.icon} size={24} className="mt-0.5" />
            <div id="int-body">
              <h2 className="t-h3">{v.title}</h2>
              <div className="t-body hat-fg2 mt-1">{v.body}</div>
            </div>
          </div>
          {v.actions && <div className="flex flex-col-reverse gap-3 @3xl:flex-row @3xl:justify-end">{v.actions}</div>}
        </section>
      </main>
    </div>
  );
}

/* ============================== Bölüm geçişi ============================== */

function TransitionScreen({ state }: ScreenProps) {
  const { go } = useHat();
  return (
    <main className="grid h-full min-h-0 place-items-center overflow-y-auto p-(--hat-gutter)">
      <section aria-labelledby="tr-title" className="hat-fade flex w-full max-w-[40rem] flex-col items-start gap-8 py-8">
        <ol className="flex items-center" aria-label="Bölümler">
          {SKILL_ORDER.map((s, i) => (
            <li key={s} className="flex items-center">
              {i > 0 && <span aria-hidden="true" className="block h-1.5 w-8 @3xl:w-14" style={{ background: i === 1 ? "var(--hat-text-primary)" : "var(--hat-border-strong)" }} />}
              <span className="relative">
                <LineBullet skill={s} size={s === "l" ? 52 : 40} muted={s !== "r" && s !== "l"} />
                {s === "r" && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full" style={{ background: "var(--hat-success)", color: "var(--hat-surface)" }}>
                    <Icon name="check" size={14} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="sr-only">{SKILLS[s].name}</span>
            </li>
          ))}
        </ol>
        <div>
          <p className="t-code hat-fg2">Durak 1 / 4 tamam</p>
          <h1 id="tr-title" className="t-h1 mt-2">
            Reading tamam.
          </h1>
          <p className="t-h2 hat-fg2 mt-1">Sıradaki durak: Listening</p>
        </div>
        {state === "error" ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-(--hat-r-2) p-4" style={{ background: "var(--hat-warning-bg)" }}>
            <p className="t-body">
              <b>Ses dosyaları indirilemedi.</b> Reading cevapların kayıtlı; bu ekranda süre işlemiyor.
            </p>
            <Btn variant="secondary" icon="refresh" onClick={() => go("transition", "success")}>
              Tekrar dene
            </Btn>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {(
              [
                ["clipboard", "5 soru · 20 dakika"],
                ["ticket", "Kaydı 2 kez dinleyebilirsin"],
                ["headphones", "Kulaklığını şimdi tak"],
              ] as [IconName, string][]
            ).map(([ic, t]) => (
              <li key={t} className="t-lead flex items-center gap-3">
                <Icon name={ic} size={22} />
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="flex w-full flex-col gap-3">
          <p className="t-label hat-fg2">{state === "empty" ? "Reading cevapların gönderildi. Nefes al; bu ekranda süre işlemiyor." : "Hazır olduğunda başla. Bu ekranda süre işlemiyor."}</p>
          <Btn
            variant="primary"
            size="lg"
            className="self-start"
            loading={state === "loading"}
            disabled={state === "error"}
            iconRight="arrowRight"
            onClick={() => go("listening", "empty")}
          >
            {state === "loading" ? "Listening hazırlanıyor" : "Listening'e başla"}
          </Btn>
        </div>
      </section>
    </main>
  );
}

/* ============================== 10 · Sınav bitti ============================== */

function ArrivalTrack() {
  const style = { "--to": "100%", "--dist": "50%" } as CSSProperties;
  return (
    <div className="relative mx-5 h-14" style={style} aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ background: sv("r", "solid"), opacity: 0.22 }} />
      <span className="hat-fill absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ background: sv("r", "solid"), width: "100%" }} />
      {[0, 50, 100].map((x) => (
        <span key={x} className="absolute top-1/2 block size-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${x}%`, background: "var(--hat-surface)", boxShadow: `inset 0 0 0 3px ${sv("r", "solid")}` }} />
      ))}
      <span className="hat-arrive absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: "100%" }}>
        <LineBullet skill="r" size={40} halo />
      </span>
    </div>
  );
}

function ResultTile({ s, score, station, note, isNew }: { s: Skill; score?: string; station?: number; note: string; isNew?: boolean }) {
  return (
    <article className="hat-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <LineBullet skill={s} size={28} />
        <h3 className="t-h3 flex-1">{SKILLS[s].name}</h3>
        {isNew && <Chip tone="signal">Yeni durak</Chip>}
      </div>
      {score ? (
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="hat-num t-h2">{score}</span>
          {station !== undefined && <span className="hat-num text-[15px] font-bold">{code(station)}</span>}
        </p>
      ) : (
        <p className="t-h3 hat-fg2 flex items-center gap-2">
          <Icon name="clock" size={20} /> Değerlendiriliyor
        </p>
      )}
      <p className="t-label hat-fg2">{note}</p>
    </article>
  );
}

function FinishedScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const celebrate = state === "success";
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-8 px-(--hat-gutter) py-10 @7xl:py-16">
        {state === "loading" ? (
          <section className="flex flex-col items-start gap-4" aria-busy="true">
            <p className="t-code hat-fg2">B1 Yolculuk Sınavı</p>
            <h1 className="t-h1">Teslim ediliyor…</h1>
            <div className="w-full max-w-md">
              <div className="h-2 overflow-hidden rounded-full hat-sunken">
                <div className="h-full rounded-full" style={{ width: "90%", background: "var(--hat-text-primary)" }} />
              </div>
              <p className="t-label hat-fg2 hat-num mt-2">Cevaplar eşitleniyor · 18 / 20</p>
            </div>
            <p className="t-body hat-fg2 flex items-center gap-2">
              <Icon name="shield" size={18} /> Bu ekranı kapatsan da cevapların bu cihazda kayıtlı.
            </p>
          </section>
        ) : state === "error" ? (
          <section className="hat-card-2">
            <ErrorState
              title="Teslim tamamlanamadı"
              body="Bağlantı gelince cevapların kendiliğinden gönderilecek. İstersen şimdi tekrar deneyebilirsin."
              reassurance="20 cevabının tamamı bu cihazda kayıtlı."
              onRetry={() => go("finished", "success")}
            />
          </section>
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <p className="t-code hat-fg2">B1 Yolculuk Sınavı · teslim 13:05</p>
              <h1 className="t-display">{celebrate ? "Reading'de yeni durak." : "Teslim ettin."}</h1>
              <p className="t-lead hat-fg2 max-w-[40rem]">
                {celebrate
                  ? "16/20 ile Reading trenin B1·03'e geldi. Geçen sınava göre +3; detay sorularında 8'de 6."
                  : "Bu sınavda yeni durak yok. Reading'de 14/20 ile B1·02'de kaldın; sonraki durak için detay sorularında 8'de 6 gerekiyor."}
              </p>
            </header>
            {celebrate && (
              <section aria-label="Reading hattında ilerleme" className="hat-card-2 overflow-hidden">
                <div className="flex flex-col gap-4 p-5 @3xl:p-6">
                  <div className="t-code hat-fg2 mx-5 flex justify-between">
                    <span>B1·01</span>
                    <span>B1·02</span>
                    <span className="hat-fg">B1·03</span>
                  </div>
                  <ArrivalTrack />
                </div>
              </section>
            )}
            <div className="grid gap-4 @3xl:grid-cols-2">
              <ResultTile s="r" score={celebrate ? "16/20" : "14/20"} station={celebrate ? 8 : 7} isNew={celebrate} note={celebrate ? "+3 geçen sınava göre" : "+1 geçen sınava göre · aynı durak"} />
              <ResultTile s="l" score="11/15" station={6} note="Aynı durak · detay sorularında 3/5" />
              <ResultTile s="w" note="En geç 17 Ekim 18:00'de hazır" />
              <ResultTile s="s" note="En geç 17 Ekim 18:00'de hazır" />
            </div>
            <div className="flex flex-col items-start gap-3">
              <Btn variant="primary" size="lg" onClick={() => go("today")}>
                Bugün’e dön
              </Btn>
              <p className="t-label hat-fg2">Writing ve Speaking değerlendirilince tam raporun açılır; sana haber vereceğiz.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================== 11 · Sonuç raporu ============================== */

const REPORT: Record<Skill, { score: number; of: number; station: number; delta: number; parts: [string, number, number][]; note: string }> = {
  r: { score: 13, of: 20, station: 7, delta: 2, parts: [["Ana fikir", 5, 6], ["Detay", 4, 8], ["Çıkarım", 4, 6]], note: "Detay sorularında 8'de 4. Soruyu okuduktan sonra metinde önce anahtar kelimeyi ara." },
  l: { score: 9, of: 15, station: 6, delta: 1, parts: [["Ana fikir", 4, 5], ["Detay", 2, 5], ["Tutum", 3, 5]], note: "Ana fikri yakalıyorsun. Detayda 5'te 2: rakam ve saat geçen yerlerde kısa not al." },
  w: { score: 12, of: 20, station: 5, delta: 0, parts: [["Görev", 4, 5], ["Düzen", 3, 5], ["Kelime", 3, 5], ["Dilbilgisi", 2, 5]], note: "Görevi tam yaptın. Geçmiş zamanda 3 hata: “I go” yerine “I went”." },
  s: { score: 10, of: 20, station: 4, delta: -1, parts: [["Akıcılık", 3, 5], ["Telaffuz", 3, 5], ["Kelime", 2, 5], ["Etkileşim", 2, 5]], note: "Konuşman 38 saniye sürdü, hedef 60. “First… then… finally…” ile anlatımı uzat." },
};

function Delta({ d }: { d: number }) {
  if (d > 0)
    return (
      <span className="t-label flex items-center gap-1" style={{ color: "var(--hat-success)" }}>
        <Icon name="trendUp" size={16} />+{d} Haziran’a göre
      </span>
    );
  return (
    <span className="t-label hat-fg2 flex items-center gap-1">
      <Icon name="minus" size={16} />
      {d === 0 ? "Haziran'la aynı" : `${d} Haziran'a göre`}
    </span>
  );
}

function SkillReport({ s, pending }: { s: Skill; pending?: boolean }) {
  const r = REPORT[s];
  return (
    <article className="hat-card flex flex-col overflow-hidden">
      <div style={{ height: 6, background: sv(s, "solid") }} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex items-center gap-3">
          <LineBullet skill={s} size={30} />
          <h3 className="t-h3 flex-1">{SKILLS[s].name}</h3>
          {!pending && <CefrPlate level={levelOf(r.station)} sub={subOf(r.station)} size="s" />}
        </header>
        {pending ? (
          <p className="t-body hat-fg2 flex items-center gap-2">
            <Icon name="clock" size={18} /> Değerlendiriliyor · en geç 28 Eylül
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="hat-num t-h1">
                {r.score}
                <span className="t-h3 hat-fg2">/{r.of}</span>
              </p>
              <Delta d={r.delta} />
            </div>
            <ul className="flex flex-col gap-2">
              {r.parts.map(([name, got, of]) => (
                <li key={name} className="grid grid-cols-[6rem_minmax(0,1fr)_2.5rem] items-center gap-3">
                  <span className="t-label hat-fg2">{name}</span>
                  <span className="relative block h-2 overflow-hidden rounded-full hat-sunken">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(got / of) * 100}%`, background: sv(s, "solid") }} />
                  </span>
                  <span className="hat-num text-right text-sm font-bold">
                    {got}/{of}
                  </span>
                </li>
              ))}
            </ul>
            <p className="t-body">{r.note}</p>
          </>
        )}
      </div>
    </article>
  );
}

function ReportScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const pending = state === "empty";
  return (
    <AppShell active="exams">
      <PageHeader
        back={
          <Btn variant="quiet" icon="chevronLeft" className="-ml-3 self-start" onClick={() => go("exams")}>
            Sınavlar
          </Btn>
        }
        kicker="Sonuç raporu · 26 Eylül 2026"
        title="B1 Eylül Sınavı"
        lead={
          <span className="flex flex-wrap items-center gap-2">
            Genel seviyen <CefrPlate level="A2" size="m" /> · B1 aktarmasına 3 durak
          </span>
        }
      />
      {state === "loading" ? (
        <div className="mt-8 grid gap-4 @3xl:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skel key={i} className="h-72" />
          ))}
        </div>
      ) : state === "error" ? (
        <section className="hat-card-2 mt-8">
          <ErrorState title="Rapor yüklenemedi" body="Sonuçların kayıtlı; yalnızca şu an gösteremiyoruz." onRetry={() => go("report", "success")} />
        </section>
      ) : (
        <div className="mt-8 grid gap-6 @7xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid gap-4 @3xl:grid-cols-2">
            {SKILL_ORDER.map((s) => (
              <SkillReport key={s} s={s} pending={pending && (s === "w" || s === "s")} />
            ))}
          </div>
          <aside className="flex flex-col gap-4 @7xl:sticky @7xl:top-0 @7xl:self-start">
            <section className="hat-card-2 flex flex-col gap-4 overflow-hidden">
              <LineStripe height={5} />
              <div className="flex flex-col gap-4 px-5 pb-5">
                <p className="t-code hat-fg2">Sonraki adım</p>
                <h2 className="t-h2">Listening Pratik · Okul duyuruları</h2>
                <p className="t-body hat-fg2">15 dk. Detay sorularına odaklanır; sonucu yolculuğuna işlenmez. 31 Ekim’e kadar açık.</p>
                <Btn variant="primary" className="self-start" iconRight="arrowRight" onClick={() => go("briefing", "empty")}>
                  Pratiğe başla
                </Btn>
              </div>
            </section>
            <section className="hat-card grid gap-4 p-5 @3xl:grid-cols-2 @7xl:grid-cols-1">
              <div className="flex flex-col gap-1">
                <p className="t-code" style={{ color: "var(--hat-success)" }}>
                  Güçlü alanın
                </p>
                <p className="t-h3">Reading · ana fikir</p>
                <p className="t-label hat-fg2 hat-num">6’da 5</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="t-code hat-fg2">Geliştirilecek alanın</p>
                <p className="t-h3">Listening · detay soruları</p>
                <p className="t-label hat-fg2 hat-num">5’te 2</p>
              </div>
            </section>
            <Btn variant="secondary" icon="file" className="self-start">
              PDF olarak indir
            </Btn>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

/* ============================== 12 · Koleksiyon ============================== */

const TICKETS: { s: Skill | "xfer"; i: number; date: string; label?: string }[] = [
  { s: "r", i: 7, date: "26 Eyl 2026" },
  { s: "l", i: 6, date: "26 Eyl 2026" },
  { s: "xfer", i: 3, date: "5 Haz 2026", label: "A2 aktarması" },
  { s: "r", i: 6, date: "5 Haz 2026" },
  { s: "l", i: 5, date: "5 Haz 2026" },
  { s: "w", i: 5, date: "5 Haz 2026" },
  { s: "s", i: 4, date: "5 Haz 2026" },
  { s: "r", i: 5, date: "14 Mar 2026" },
  { s: "w", i: 4, date: "14 Mar 2026" },
];

function TicketCard({ t }: { t: (typeof TICKETS)[number] }) {
  const xfer = t.s === "xfer";
  return (
    <li
      className="relative flex min-h-24 overflow-hidden rounded-(--hat-r-2)"
      style={xfer ? { background: "var(--hat-cefr-c2)", color: "var(--hat-cefr-c2-fg)" } : { background: "var(--hat-surface)", boxShadow: "inset 0 0 0 2px var(--hat-border-strong)" }}
    >
      <span aria-hidden="true" className="w-2 shrink-0" style={{ background: xfer ? "var(--hat-signal)" : sv(t.s as Skill, "solid") }} />
      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          {xfer ? <span aria-hidden="true" className="block h-6 w-3.5 rounded-full" style={{ boxShadow: "inset 0 0 0 3px currentColor" }} /> : <LineBullet skill={t.s as Skill} size={22} />}
          <span className="t-label">{xfer ? t.label : SKILLS[t.s as Skill].name}</span>
        </div>
        <p className="hat-num text-[22px] font-bold leading-none">{xfer ? "A2" : code(t.i)}</p>
      </div>
      <div className="flex w-16 flex-col items-center justify-center border-l-2 border-dashed px-1 text-center" style={{ borderColor: xfer ? "rgb(255 212 0 / 0.5)" : "var(--hat-border-strong)" }}>
        <span className="t-code" style={{ opacity: 0.85 }}>
          {t.date.split(" ").slice(0, 2).join(" ")}
        </span>
        <span className="t-code" style={{ opacity: 0.65 }}>
          {t.date.split(" ")[2]}
        </span>
      </div>
    </li>
  );
}

function MiniHistory({ s }: { s: Skill }) {
  const ys = HISTORY.map((h) => h.pos[s]);
  const min = 3;
  const max = 8;
  const pts = ys.map((y, i) => [10 + i * 50, 50 - ((y - min) / (max - min)) * 40] as const);
  return (
    <div className="hat-card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <LineBullet skill={s} size={22} />
        <span className="t-label flex-1">{SKILLS[s].name}</span>
        <span className="hat-num text-sm font-bold">
          {code(ys[0])} → {code(ys[2])}
        </span>
      </div>
      <svg viewBox="0 0 120 60" className="h-16 w-full" aria-label={`${SKILLS[s].name}: ${HISTORY.map((h) => `${h.label} ${code(h.pos[s])}`).join(", ")}`} role="img">
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" strokeWidth="3" strokeLinejoin="round" style={{ stroke: sv(s, "solid") }} />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 2 ? 5 : 3.5} strokeWidth="2.5" style={{ fill: "var(--hat-surface)", stroke: sv(s, "solid") }} />
        ))}
      </svg>
      <div className="t-code hat-fg2 flex justify-between px-1">
        {HISTORY.map((h) => (
          <span key={h.label}>{h.label}</span>
        ))}
      </div>
    </div>
  );
}

function CollectionScreen({ state }: ScreenProps) {
  const { go } = useHat();
  const [compare, setCompare] = useState(false);
  return (
    <AppShell active="collection">
      <PageHeader kicker="Koleksiyon" title="Biletlerin" lead="Geçtiğin her durak bir bilet. Biletler yalnızca gerçek sınav sonuçlarından gelir." />
      {state === "loading" ? (
        <div className="mt-8 grid gap-6 @5xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy="true">
          <div className="grid gap-3 @3xl:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skel key={i} className="h-24" />
            ))}
          </div>
          <Skel className="h-80" />
        </div>
      ) : state === "error" ? (
        <section className="hat-card-2 mt-8">
          <ErrorState title="Koleksiyonun yüklenemedi" body="Biletlerin kayıtlı; bağlantı gelince yeniden göstereceğiz." onRetry={() => go("collection", "success")} />
        </section>
      ) : state === "empty" ? (
        <section className="hat-card-2 mt-8">
          <EmptyState
            title="İlk biletin ilk sınavından gelir"
            body="Bir sınavı bitirdiğinde ulaştığın her durak için buraya bir bilet düşer. Seri de ilk haftandan başlar."
            action={
              <Btn variant="primary" iconRight="arrowRight" onClick={() => go("exams")}>
                Sınavlarına bak
              </Btn>
            }
          />
        </section>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <div className="grid gap-6 @5xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-labelledby="tickets">
              <h2 id="tickets" className="t-h3 mb-4">
                {TICKETS.length} bilet
              </h2>
              <ul className="grid gap-3 @3xl:grid-cols-2 @7xl:grid-cols-3">
                {TICKETS.map((t, i) => (
                  <TicketCard key={i} t={t} />
                ))}
              </ul>
            </section>
            <div className="flex flex-col gap-4">
              <StreakCard />
              <section className="hat-card flex flex-col gap-4 p-5" aria-labelledby="xfers">
                <h2 id="xfers" className="t-code hat-fg2">
                  Seviye geçişleri
                </h2>
                <ol className="flex flex-col">
                  {[
                    { lv: "B1" as Level, t: "B1 aktarması", d: "Sıradaki · 3 durak", next: true },
                    { lv: "A2" as Level, t: "A2 aktarması", d: "5 Haziran 2026 · 4 hat" },
                    { lv: "A1" as Level, t: "Yolculuk başladı", d: "14 Mart 2026" },
                  ].map((x, i, arr) => (
                    <li key={x.t} className="relative flex items-start gap-3 pb-5 last:pb-0">
                      {i < arr.length - 1 && <span aria-hidden="true" className="absolute left-[19px] top-10 bottom-0 w-1" style={{ background: "var(--hat-border-strong)" }} />}
                      <CefrPlate level={x.lv} size="m" />
                      <div>
                        <p className="t-body font-bold">{x.t}</p>
                        <p className="t-label hat-fg2">{x.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
          <section aria-labelledby="compare">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="compare" className="t-h3">
                  Geçmişinle karşılaştır
                </h2>
                <p className="t-label hat-fg2">Son 3 sınav · Mart, Haziran, Eylül</p>
              </div>
            </div>
            <div className="grid gap-4 @3xl:grid-cols-2 @7xl:grid-cols-4">
              {SKILL_ORDER.map((s) => (
                <MiniHistory key={s} s={s} />
              ))}
            </div>
          </section>
          <section className="hat-card flex flex-col gap-4 p-5 @3xl:flex-row @3xl:items-center" aria-labelledby="cls">
            <div className="flex-1">
              <h2 id="cls" className="t-h3">
                Sınıf içi karşılaştırma
              </h2>
              <p className="t-label hat-fg2 mt-1">{compare ? "Reading'de sınıfının üst yarısındasın. Speaking'de sınıf ortalamasına 1 durak uzaktasın." : "Kapalı. Açarsan yalnızca sen görürsün; sıra numarası gösterilmez."}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={compare}
              aria-labelledby="cls"
              onClick={() => setCompare(!compare)}
              className="relative h-11 w-[4.5rem] shrink-0 rounded-full"
              style={{ background: compare ? "var(--hat-text-primary)" : "var(--hat-surface-sunken)", boxShadow: "inset 0 0 0 2px var(--hat-border-strong)", transition: "background-color var(--hat-dur-fast) var(--hat-ease-out)" }}
            >
              <span
                aria-hidden="true"
                className="absolute top-1.5 block size-8 rounded-full"
                style={{ left: compare ? "calc(100% - 2.375rem)" : "0.375rem", background: compare ? "var(--hat-signal)" : "var(--hat-surface)", boxShadow: "inset 0 0 0 2px #111111", transition: "left var(--hat-dur-base) var(--hat-ease-out)" }}
              />
            </button>
          </section>
        </div>
      )}
    </AppShell>
  );
}

/* ============================== 13 · Profil ============================== */

function ProfileScreen({ state }: ScreenProps) {
  const { avatar, setAvatar, theme, setTheme, reader, setReader, toast, go } = useHat();
  const [draft, setDraft] = useState<AvatarCfg>(state === "empty" ? DEFAULT_AVATAR : avatar);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveIt = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      if (state === "error" && !failed) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setAvatar(draft);
      toast("Profilin kaydedildi");
    }, 600);
  };
  if (state === "loading")
    return (
      <AppShell active="profile">
        <PageHeader kicker="Profil" title="Senin durağın" />
        <div className="mt-8 grid gap-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" aria-busy="true">
          <Skel className="h-80" />
          <Skel className="h-[30rem]" />
        </div>
      </AppShell>
    );
  return (
    <AppShell active="profile">
      <PageHeader kicker="Profil" title="Senin durağın" lead={state === "empty" ? "Avatarını henüz kişiselleştirmedin. Bir şekil, bir renk ve bir durak adı seç." : "Avatarın, Bugün ekranında ve öğretmeninin listesinde görünür."} />
      <div className="mt-8 grid gap-6 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] @5xl:items-start">
        <section aria-label="Önizleme" className="hat-card-2 flex flex-col items-center gap-4 overflow-hidden pb-6 text-center @5xl:sticky @5xl:top-0">
          <LineStripe />
          <div className="mt-4">
            <Avatar cfg={draft} size={144} />
          </div>
          <div>
            <p className="t-h2">{STUDENT.full}</p>
            <p className="t-label hat-fg2">
              {STUDENT.cls} · {STUDENT.school}
            </p>
          </div>
          <div className="hat-sunken flex min-h-11 items-center gap-2 rounded-(--hat-r-1) px-3">
            <span aria-hidden="true" className="block size-3 rounded-full" style={{ background: "var(--hat-signal)", boxShadow: "0 0 0 2px #111111" }} />
            <span className="t-label">{draft.stop || "Durak adın yok"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CefrPlate level="A2" size="m" />
            <span className="t-label hat-fg2">6 haftalık seri · 9 bilet</span>
          </div>
        </section>
        <section aria-label="Düzenle" className="hat-card flex flex-col gap-7 p-5 @3xl:p-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="t-h3 mb-3">Şekil</legend>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Şekil">
              {SKILL_ORDER.map((s) => {
                const on = draft.shape === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={SKILLS[s].shape}
                    onClick={() => setDraft({ ...draft, shape: s })}
                    className="grid size-16 place-items-center rounded-(--hat-r-2)"
                    style={{ boxShadow: on ? "inset 0 0 0 3px var(--hat-text-primary)" : "inset 0 0 0 2px var(--hat-border)", background: on ? "var(--hat-surface-sunken)" : undefined }}
                  >
                    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
                      <path d={SHAPE[s]} style={{ fill: "var(--hat-text-primary)" }} />
                    </svg>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="t-h3 mb-3">Renk</legend>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Renk">
              {AVATAR_COLORS.map((c, i) => {
                const on = draft.color === i;
                return (
                  <button
                    key={c.name}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setDraft({ ...draft, color: i })}
                    className="grid size-12 place-items-center rounded-full"
                    style={{ background: c.bg, color: c.fg, boxShadow: on ? "0 0 0 3px var(--hat-surface), 0 0 0 6px var(--hat-text-primary)" : "inset 0 0 0 1.5px var(--hat-border-strong)" }}
                  >
                    {on && <Icon name="check" size={22} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="t-h3 mb-3">Desen</legend>
            <Seg
              label="Desen"
              value={draft.pattern}
              onChange={(pattern) => setDraft({ ...draft, pattern })}
              options={[
                { v: "none", label: "Düz" },
                { v: "stripes", label: "Çizgi" },
                { v: "dots", label: "Nokta" },
                { v: "grid", label: "Izgara" },
              ]}
            />
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="stop" className="t-h3">
              Durak adın
            </label>
            <p className="t-label hat-fg2">Haritada trenin bu durağın adıyla görünür. En fazla 24 karakter.</p>
            <input
              id="stop"
              className="hat-input mt-1"
              maxLength={24}
              value={draft.stop}
              placeholder="ör. Moda İskelesi"
              onChange={(e) => setDraft({ ...draft, stop: e.target.value })}
            />
            <p className="t-code hat-fg3 self-end">{draft.stop.length}/24</p>
          </div>
          <div className="hat-bd grid gap-6 border-t pt-6 @3xl:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="t-label">Görünüm</p>
              <Seg
                label="Görünüm"
                full
                value={theme}
                onChange={setTheme}
                options={[
                  { v: "light", label: "Açık" },
                  { v: "dark", label: "Koyu" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <p className="t-label">Sınavda metin boyutu</p>
              <Seg
                label="Sınavda metin boyutu"
                full
                value={reader.size}
                onChange={(size) => setReader({ ...reader, size })}
                options={(["s", "m", "l", "xl"] as const).map((v, i) => ({ v, aria: ["Küçük", "Orta", "Büyük", "Çok büyük"][i], label: <span style={{ fontSize: 13 + i * 3 }}>A</span> }))}
              />
            </div>
          </div>
          {failed && (
            <div role="alert" className="flex items-start gap-3 rounded-(--hat-r-2) p-4" style={{ background: "var(--hat-warning-bg)" }}>
              <Icon name="cloudOff" size={22} className="mt-0.5" />
              <p className="t-body">
                <b>Kaydedilemedi.</b> Seçimlerin bu ekranda duruyor; bağlantı gelince tekrar dene.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="primary" size="lg" loading={saving} onClick={saveIt}>
              {failed ? "Tekrar dene" : "Kaydet"}
            </Btn>
            <Btn variant="quiet" icon="logout" onClick={() => go("today")}>
              Çıkış yap
            </Btn>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ============================== Prototip kabuğu ============================== */

const SCREENS: { id: ScreenId; no: string; name: string; exam?: boolean; Component: (p: ScreenProps) => ReactNode; states: Record<UiState, string>; why: string }[] = [
  {
    id: "today",
    no: "1",
    name: "Bugün",
    Component: TodayScreen,
    states: { success: "Açık sınav var", empty: "Açık sınav yok", loading: "Yükleniyor", error: "Hata" },
    why: "Ekranın tek kahramanı şu an girilebilecek sınav; seri, seviye ve son sefer yanında sessiz kartlar olarak duruyor. Kartın sağındaki metro çizgileri süs değil, ürünün bütün görsel dilini ilk saniyede tanıtıyor.",
  },
  {
    id: "journey",
    no: "2",
    name: "Yolculuğum",
    Component: JourneyScreen,
    states: { success: "Harita", empty: "İlk sınav öncesi", loading: "Yükleniyor", error: "Hata" },
    why: "Dört beceri dört paralel hat; geride kalan tren (Speaking) tablo okumadan görülüyor ve seçili hattın detayı “sonraki durak için ne gerekiyor”u somut söylüyor. Aktarma kapsülü CEFR seviye geçişini dört hattın buluşması olarak anlatıyor.",
  },
  {
    id: "exams",
    no: "3",
    name: "Sınav listesi",
    Component: ExamsScreen,
    states: { success: "Liste", empty: "Hiç sınav yok", loading: "Yükleniyor", error: "Hata" },
    why: "Açık, yaklaşan ve tamamlanan üç ayrı yüzey dilinde: açık sınav kalkık kart, yaklaşan gömük ve kilitli, tamamlanan durak kodlarıyla. Masaüstünde üç sütun, tablet ve telefonda aynı sırayla yığılıyor.",
  },
  {
    id: "briefing",
    no: "4",
    name: "Sınav öncesi brifing",
    exam: true,
    Component: BriefingScreen,
    states: { success: "Hazır", empty: "Kontrol öncesi", loading: "Mikrofon aranıyor", error: "Mikrofon izni yok" },
    why: "Kurallar yasak listesi değil, “neyin güvende olduğu” listesi olarak yazıldı; kaygıyı bilinmezlik büyütür. Başla butonu cihaz kontrolü bitene kadar kilitli ve nedenini yanında söylüyor.",
  },
  {
    id: "reading",
    no: "5",
    name: "Reading",
    exam: true,
    Component: ReadingScreen,
    states: { success: "Devam ediyor", empty: "İlk soru", loading: "Yükleniyor", error: "Çevrimdışı" },
    why: "Sorunun baktığı paragraf metinde işaretleniyor ve “Soru 2 bu paragrafta” yazıyor; metin–soru ilişkisi aranmıyor, gösteriliyor. Tablet yatay ve masaüstünde metin ile soru yan yana, dar ekranda tek dokunuşla geçilen iki görünüm.",
  },
  {
    id: "listening",
    no: "6",
    name: "Listening",
    exam: true,
    Component: ListeningScreen,
    states: { success: "1 hak kaldı", empty: "Dinlenmedi", loading: "Ses hazırlanıyor", error: "Ses yüklenemedi" },
    why: "Dinleme hakkı soyut bir sayı değil, zımbalanan bilet: kullanılan hak şekil değiştiriyor, renk körlüğüne dayanıklı. Hata durumunda ilk cümle “hakkın kullanılmadı”, çünkü çocuğun ilk korkusu bu.",
  },
  {
    id: "writing",
    no: "7",
    name: "Writing",
    exam: true,
    Component: WritingScreen,
    states: { success: "Taslak kayıtlı", empty: "Boş sayfa", loading: "Taslak geri yükleniyor", error: "Taslak cihazda" },
    why: "Kelime sayacı hedef aralığı çerçeveli bir bölge olarak gösteriyor; sayı değil konum okunuyor. Yazım denetimi kapalı, çünkü tarayıcı düzeltmesi ölçülen beceriye yardım eder.",
  },
  {
    id: "speaking",
    no: "8",
    name: "Speaking",
    exam: true,
    Component: SpeakingScreen,
    states: { success: "Kendini dinle", empty: "Mikrofon testi", loading: "Hazırlık", error: "Ses gelmiyor" },
    why: "Kayıt hiçbir zaman aniden başlamıyor: test, hazırlık, 3-2-1 ve kayıt; her adımın tek eylemi alt barda. Kırmızı kayıt ışığı yerine sakin bir halka ve canlı ses çubukları var, çocuk konuştuğunu görüyor ama izlendiğini hissetmiyor.",
  },
  {
    id: "interrupt",
    no: "9",
    name: "Duraklatma · bağlantı · cihaz",
    exam: true,
    Component: InterruptScreen,
    states: { success: "Geri bağlandı", empty: "Duraklatıldı", loading: "Bağlantı koptu", error: "Cihaz değişti" },
    why: "Dört durumda da en büyük öğe aynı cümle: “Cevapların kayıtlı.” Ne olduğu ikinci sırada, ne yapılacağı üçüncü sırada; bağlantı koptuğunda yapılacak bir şey olmadığı açıkça söyleniyor.",
  },
  {
    id: "transition",
    no: "9b",
    name: "Bölüm geçişi",
    exam: true,
    Component: TransitionScreen,
    states: { success: "Hazır", empty: "Reading yeni bitti", loading: "Listening hazırlanıyor", error: "Ses indirilemedi" },
    why: "Metro metaforunun sınav içindeki tek izi bu: “Sıradaki durak: Listening.” Süre işlemiyor ve bu yazılı, böylece ekran gerçek bir nefes alma anı oluyor.",
  },
  {
    id: "finished",
    no: "10",
    name: "Sınav bitti",
    Component: FinishedScreen,
    states: { success: "Yeni durak (kutla)", empty: "Yeni durak yok", loading: "Teslim ediliyor", error: "Teslim edilemedi" },
    why: "Kutlama yalnızca gerçek bir ilerleme varsa geliyor ve konfeti değil, trenin bir durak ilerlemesi. İlerleme yoksa başlık sadece “Teslim ettin.” ve hemen sonraki durak için gereken somut hedef.",
  },
  {
    id: "report",
    no: "11",
    name: "Sonuç raporu",
    Component: ReportScreen,
    states: { success: "Tam rapor", empty: "Kısmi (W/S bekliyor)", loading: "Yükleniyor", error: "Hata" },
    why: "Puan hiçbir yerde yalnız değil: her zaman CEFR durağı, değişim ve alt beceri kırılımıyla. Düşüş kırmızıyla değil nötr tonla gösteriliyor ve ekranın tek birincil eylemi zayıf alana yönelik pratik.",
  },
  {
    id: "collection",
    no: "12",
    name: "İlerleme · koleksiyon",
    Component: CollectionScreen,
    states: { success: "Biletler", empty: "Hiç bilet yok", loading: "Yükleniyor", error: "Hata" },
    why: "Rozet enflasyonu yerine yalnızca gerçek duraklardan gelen biletler; her biri tarih ve durak kodu taşıyor, bu yüzden değerli. Sınıf karşılaştırması kapalı başlıyor, açılınca bile sıra numarası değil bant söylüyor.",
  },
  {
    id: "profile",
    no: "13",
    name: "Profil · avatar",
    Component: ProfileScreen,
    states: { success: "Kişiselleştirilmiş", empty: "Varsayılan", loading: "Yükleniyor", error: "Kaydedilemedi" },
    why: "Avatar illüstrasyon değil, hat şekillerinden kurulan bir monogram; 14 yaşındakini küçümsemeden aidiyet veriyor. Durak adı küçük ama kişisel bir dokunuş: haritada “benim durağım” hissi.",
  },
];

const DEVICES = {
  fit: { label: "Sığdır", w: 0, h: 0 },
  phone: { label: "Telefon 390", w: 390, h: 844 },
  tabletP: { label: "Tablet dikey 820", w: 820, h: 1180 },
  tabletL: { label: "Tablet yatay 1180", w: 1180, h: 820 },
  desktop: { label: "Masaüstü 1440", w: 1440, h: 900 },
} as const;
type DeviceId = keyof typeof DEVICES;

function ProtoSeg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-black/55">{label}</span>
      <div className="flex rounded-md bg-black/[0.07] p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={o.v === value}
            onClick={() => onChange(o.v)}
            className={cx("min-h-8 rounded px-2.5 whitespace-nowrap", o.v === value ? "bg-white font-semibold shadow-sm" : "text-black/70 hover:text-black")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HatPrototype() {
  const [screen, setScreen] = useState<ScreenId>("today");
  const [uiState, setUiState] = useState<UiState>("success");
  const [device, setDevice] = useState<DeviceId>("fit");
  const [theme, setTheme] = useState<Theme>("light");
  const [age, setAge] = useState<Age>("teen");
  const [reader, setReader] = useState<Reader>({ size: "m", leading: "normal" });
  const [avatar, setAvatar] = useState<AvatarCfg>(DEFNE_AVATAR);
  const [toastMsg, setToastMsg] = useState<{ id: number; m: string } | null>(null);
  const [showWhy, setShowWhy] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const meta = SCREENS.find((s) => s.id === screen)!;
  const dev = DEVICES[device];
  const fit = device === "fit";
  const inset = fit ? 0 : 24;
  const w = fit ? stage.w : dev.w;
  const h = fit ? stage.h : dev.h;
  const scale = fit ? 1 : Math.min(1, (stage.w - inset * 2) / dev.w, (stage.h - inset * 2) / dev.h);
  const View = meta.Component;

  const ctx: HatCtx = {
    go: (id, st = "success") => {
      setScreen(id);
      setUiState(st);
    },
    theme,
    setTheme,
    reader,
    setReader,
    toast: (m) => setToastMsg({ id: Date.now(), m }),
    avatar,
    setAvatar,
  };

  return (
    <div className="flex h-dvh flex-col bg-[#E3E1DA] font-sans text-[13px] text-[#111]">
      <style>{HAT_CSS}</style>
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-black/10 bg-[#F6F5F1] px-4 py-2">
        <strong className="font-mono tracking-wide">HAT · öğrenci prototipi</strong>
        <label className="flex items-center gap-2">
          <span className="text-black/55">Ekran</span>
          <select
            value={screen}
            onChange={(e) => {
              setScreen(e.target.value as ScreenId);
              setUiState("success");
            }}
            className="min-h-8 rounded-md border border-black/15 bg-white px-2"
          >
            {SCREENS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.no}. {s.name}
              </option>
            ))}
          </select>
        </label>
        <ProtoSeg label="Durum" value={uiState} onChange={setUiState} options={(["success", "empty", "loading", "error"] as UiState[]).map((k) => ({ v: k, label: meta.states[k] }))} />
        <ProtoSeg label="Cihaz" value={device} onChange={setDevice} options={(Object.keys(DEVICES) as DeviceId[]).map((k) => ({ v: k, label: DEVICES[k].label }))} />
        <ProtoSeg
          label="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            { v: "light", label: "Açık" },
            { v: "dark", label: "Koyu" },
          ]}
        />
        <ProtoSeg
          label="Yaş bandı"
          value={age}
          onChange={setAge}
          options={[
            { v: "junior", label: "Junior" },
            { v: "teen", label: "9–15" },
            { v: "adult", label: "16+" },
          ]}
        />
        <button type="button" aria-pressed={showWhy} onClick={() => setShowWhy((v) => !v)} className="min-h-8 rounded-md px-2 underline underline-offset-4">
          Tasarım notu
        </button>
        {showWhy && <p className="basis-full text-[12.5px] leading-snug text-black/70">{meta.why}</p>}
      </header>
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute" style={{ width: w * scale, height: h * scale, left: (stage.w - w * scale) / 2, top: fit ? 0 : (stage.h - h * scale) / 2 }}>
          <div
            className={cx("@container relative overflow-hidden", !fit && "rounded-[22px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/25")}
            style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <Ctx.Provider value={ctx}>
              <div
                data-hat=""
                data-theme={theme}
                data-age={age}
                data-mode={meta.exam ? "exam" : "panel"}
                data-reader-size={reader.size}
                data-reader-leading={reader.leading}
                lang="tr"
                className="relative h-full w-full overflow-hidden"
              >
                <View key={`${screen}-${uiState}`} state={uiState} />
                {toastMsg && <Toast key={toastMsg.id} message={toastMsg.m} />}
              </div>
            </Ctx.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
