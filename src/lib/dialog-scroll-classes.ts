/** スマホで中身が長い編集ダイアログをスクロール可能にする */
export const SCROLL_DIALOG_CONTENT =
  "top-[max(0.5rem,env(safe-area-inset-top,0px))] flex max-h-[min(90dvh,calc(100dvh-1rem))] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-1/2 sm:max-h-[85vh] sm:-translate-y-1/2";

export const SCROLL_DIALOG_HEADER = "shrink-0 px-4 pt-4";

export const SCROLL_DIALOG_BODY =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2";

export const SCROLL_DIALOG_FOOTER =
  "mx-0 mb-0 shrink-0 border-t border-border/60 px-4 py-4";
