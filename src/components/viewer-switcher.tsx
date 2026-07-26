import Link from "next/link";

type ViewerSwitcherProps = {
  viewer: "fred" | "sara";
};

export function ViewerSwitcher({ viewer }: ViewerSwitcherProps) {
  const otherViewer = viewer === "fred" ? "sara" : "fred";

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase">
        Viewing as
      </span>
      <Link
        className="border border-rule bg-card px-3 py-2 font-mono text-[11px] tracking-[0.06em] text-ink uppercase"
        href={`/workspace?as=${otherViewer}`}
      >
        {viewer}
        <span aria-hidden="true" className="ml-2 text-ink-muted">
          ▾
        </span>
      </Link>
    </div>
  );
}
