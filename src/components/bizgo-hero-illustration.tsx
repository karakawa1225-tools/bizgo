import { cn } from "@/lib/utils";

/** Biz!Go! 向けのオリジナル SVG（経費・出張・レシートのイメージ） */
export function BizGoHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 220"
      role="img"
      aria-label="経費精算と出張をスマートにまとめるイメージ"
      className={cn("h-auto w-full max-w-md text-primary", className)}
    >
      <defs>
        <linearGradient id="bizgo-sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.55 0.12 185)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.35 0.08 250)" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="bizgo-card" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.92 0.02 185)" />
          <stop offset="100%" stopColor="oklch(0.82 0.04 200)" />
        </linearGradient>
      </defs>
      <rect width="400" height="220" rx="24" fill="url(#bizgo-sky)" />
      <ellipse cx="200" cy="200" rx="160" ry="18" fill="currentColor" opacity="0.06" />
      {/* 飛行機・移動 */}
      <path
        d="M72 72 L118 88 L108 96 L88 92 L72 108 L76 88 Z"
        fill="oklch(0.72 0.14 195)"
        opacity="0.9"
      />
      <path
        d="M300 58 Q330 70 310 82 L295 78 Z"
        fill="oklch(0.65 0.1 210)"
        opacity="0.5"
      />
      {/* レシート */}
      <g transform="translate(248 48) rotate(6)">
        <rect
          x="0"
          y="0"
          width="88"
          height="112"
          rx="8"
          fill="url(#bizgo-card)"
          stroke="oklch(0.55 0.06 200)"
          strokeWidth="1.5"
        />
        <line x1="14" y1="24" x2="74" y2="24" stroke="oklch(0.5 0.04 200)" strokeWidth="3" strokeLinecap="round" />
        <line x1="14" y1="40" x2="60" y2="40" stroke="oklch(0.55 0.04 200)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="14" y1="52" x2="68" y2="52" stroke="oklch(0.55 0.04 200)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="14" y1="64" x2="52" y2="64" stroke="oklch(0.55 0.04 200)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <text x="44" y="92" textAnchor="middle" fontSize="14" fontWeight="700" fill="oklch(0.45 0.12 175)">
          ¥
        </text>
      </g>
      {/* スマホ */}
      <g transform="translate(56 56)">
        <rect
          x="0"
          y="0"
          width="100"
          height="148"
          rx="14"
          fill="oklch(0.22 0.02 250)"
          stroke="oklch(0.45 0.06 200)"
          strokeWidth="2"
        />
        <rect x="10" y="18" width="80" height="100" rx="6" fill="oklch(0.35 0.06 195)" />
        <rect x="18" y="32" width="48" height="8" rx="2" fill="oklch(0.72 0.12 175)" opacity="0.9" />
        <rect x="18" y="48" width="64" height="6" rx="2" fill="oklch(0.85 0.02 200)" opacity="0.5" />
        <rect x="18" y="60" width="56" height="6" rx="2" fill="oklch(0.85 0.02 200)" opacity="0.5" />
        <circle cx="50" cy="128" r="6" fill="oklch(0.55 0.1 175)" />
      </g>
      {/* 矢印 GO */}
      <path
        d="M168 118 L228 118 L218 108 M228 118 L218 128"
        stroke="oklch(0.62 0.16 165)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="198"
        y="168"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="oklch(0.72 0.14 175)"
        fontFamily="system-ui, sans-serif"
      >
        精算をサクッと
      </text>
    </svg>
  );
}
