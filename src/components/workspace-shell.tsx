"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ViewerSwitcher } from "@/components/viewer-switcher";
import type { WebViewer } from "@/lib/context-view";

type WorkspaceShellProps = {
  children: ReactNode;
  itemCount: number;
  viewer: WebViewer;
};

export function WorkspaceShell({
  children,
  itemCount,
  viewer,
}: WorkspaceShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestedViewer, setRequestedViewer] =
    useState<WebViewer | null>(null);
  const displayedViewer =
    isPending && requestedViewer ? requestedViewer : viewer;

  function changeViewer(nextViewer: WebViewer) {
    if (nextViewer === viewer) {
      return;
    }

    setRequestedViewer(nextViewer);
    startTransition(() => {
      router.push(`/workspace?as=${nextViewer}`, { scroll: false });
    });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-5 py-10 sm:px-7 sm:py-14">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold text-ink">
              Launch planning
            </h1>
            <p className="mt-2 font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase">
              Shared context, {itemCount} items
            </p>
          </div>
          <ViewerSwitcher
            isPending={isPending}
            onViewerChange={changeViewer}
            viewer={displayedViewer}
          />
        </div>
        <div aria-hidden="true" className="mt-6 border-t border-rule" />
      </header>

      <div
        aria-busy={isPending}
        className={isPending ? "pointer-events-none opacity-50" : ""}
        inert={isPending}
      >
        {children}
      </div>
    </main>
  );
}
