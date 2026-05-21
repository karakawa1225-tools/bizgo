"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, LayoutGrid, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "TOP", icon: Sparkles, exact: true },
  { href: "/home", label: "Home", icon: Home, exact: true },
  { href: "/create", label: "作成", icon: Building2, exact: false },
  { href: "/expenses", label: "一覧", icon: LayoutGrid, exact: true },
] as const;

export function AppBottomNav() {
  const pathname = usePathname();
  const hide =
    pathname.startsWith("/expenses/") &&
    pathname !== "/expenses" &&
    !pathname.startsWith("/expenses/new");

  if (hide) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      aria-label="メインメニュー"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[0.65rem] font-medium no-underline transition-colors sm:text-xs",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
