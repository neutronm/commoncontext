"use client";

import { useRouter } from "next/navigation";

type ViewerSwitcherProps = {
  viewer: "fred" | "sara";
};

export function ViewerSwitcher({ viewer }: ViewerSwitcherProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <label
        className="font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase"
        htmlFor="viewer"
      >
        Viewing as
      </label>
      <select
        className="border border-rule bg-card px-3 py-2 font-mono text-[11px] tracking-[0.06em] text-ink uppercase"
        id="viewer"
        onChange={(event) =>
          router.push(`/workspace?as=${event.target.value}`)
        }
        value={viewer}
      >
        <option value="fred">Fred</option>
        <option value="sara">Sara</option>
      </select>
    </div>
  );
}
