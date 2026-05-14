import { cn } from "@/lib/utils";

type Props = {
  /** hero = TOP のメインロゴ、inline = ヘッダー用小さめ */
  variant?: "hero" | "inline";
  className?: string;
};

/**
 * アプリ名「Biz!Go!」— 立体感（ハイライト + 奥行きシャドウ）
 */
export function BizGoMark({ variant = "hero", className }: Props) {
  const scale =
    variant === "hero"
      ? "text-[clamp(2.75rem,9vw,4.25rem)] sm:text-7xl"
      : "text-2xl sm:text-3xl";

  return (
    <span
      className={cn(
        "bizgo-mark-3d inline-flex flex-wrap items-baseline gap-0 font-black tracking-tighter",
        scale,
        className,
      )}
      lang="en"
      aria-label="BizGo"
    >
      <span className="bizgo-mark-3d__word">Biz</span>
      <span className="bizgo-mark-3d__punct">!</span>
      <span className="bizgo-mark-3d__word">Go</span>
      <span className="bizgo-mark-3d__punct">!</span>
    </span>
  );
}
