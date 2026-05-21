import type { ReactNode } from "react";

import { AppBottomNav } from "@/components/app-bottom-nav";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** 下ナビ分の余白を付ける */
  withNav?: boolean;
  className?: string;
};

export function AppPageShell({
  children,
  withNav = true,
  className,
}: Props) {
  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      {children}
      {withNav ? <AppBottomNav /> : null}
    </div>
  );
}
