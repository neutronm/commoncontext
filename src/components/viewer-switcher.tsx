"use client";

import {
  viewerDisplayName,
  type WebViewer,
} from "@/lib/context-view";

type ViewerSwitcherProps = {
  isPending: boolean;
  onViewerChange: (viewer: WebViewer) => void;
  viewer: WebViewer;
};

export function ViewerSwitcher({
  isPending,
  onViewerChange,
  viewer,
}: ViewerSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      <div className="flex items-center gap-3">
        <label
          className="font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase"
          htmlFor="viewer"
        >
          Viewing as
        </label>
        <select
          aria-describedby="viewer-loading-status"
          className="border border-rule bg-card px-3 py-2 font-mono text-[11px] tracking-[0.06em] text-ink uppercase disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
          id="viewer"
          onChange={(event) =>
            onViewerChange(event.target.value as WebViewer)
          }
          value={viewer}
        >
          <option value="fred">Fred</option>
          <option value="sara">Sara</option>
        </select>
      </div>
      <span
        aria-live="polite"
        className="min-w-[132px] font-mono text-[11px] tracking-[0.06em] text-pending uppercase"
        id="viewer-loading-status"
        role="status"
      >
        {isPending ? `Loading ${viewerDisplayName(viewer)}’s view…` : ""}
      </span>
    </div>
  );
}
