"use client";

import { FileText } from "lucide-react";

import { isReceiptPdfDataUrl } from "@/lib/receipt-file-import";
import { cn } from "@/lib/utils";

type Props = {
  dataUrl: string;
  className?: string;
  imgClassName?: string;
};

export function ReceiptAttachmentPreview({
  dataUrl,
  className,
  imgClassName,
}: Props) {
  if (isReceiptPdfDataUrl(dataUrl)) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border/60 bg-muted/30",
          className,
        )}
      >
        <iframe
          title="領収書PDFプレビュー"
          src={dataUrl}
          className="h-44 w-full border-0 bg-background sm:h-48"
        />
        <p className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" aria-hidden />
          PDFを登録済み
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border/60", className)}>
      <img
        src={dataUrl}
        alt="領収書プレビュー"
        className={cn(
          "max-h-40 w-full object-contain bg-black/20",
          imgClassName,
        )}
      />
    </div>
  );
}
