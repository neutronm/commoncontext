import { ContextCard } from "@/components/context-card";
import {
  mockParticipants,
  mockWorkspaceObjects,
} from "@/components/mock-data";
import { ViewerSwitcher } from "@/components/viewer-switcher";

export const dynamic = "force-dynamic";

type WorkspacePageProps = {
  searchParams: Promise<{ as?: string | string[] }>;
};

function resolveViewer(value: string | string[] | undefined) {
  return value === "sara" ? ("sara" as const) : ("fred" as const);
}

export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const viewer = resolveViewer((await searchParams).as);
  const objects = mockWorkspaceObjects[viewer];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-5 py-10 sm:px-7 sm:py-14">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold text-ink">
              Launch planning
            </h1>
            <p className="mt-2 font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase">
              Shared context, {objects.length} items
            </p>
          </div>
          <ViewerSwitcher viewer={viewer} />
        </div>
        <div aria-hidden="true" className="mt-6 border-t border-rule" />
      </header>

      {objects.length > 0 ? (
        <div className="mt-7 space-y-5">
          {objects.map((object) => (
            <ContextCard
              key={object.id}
              object={object}
              participants={mockParticipants}
            />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-[17px] leading-7 text-ink">
          Nothing has been shared with you yet.
        </p>
      )}
    </main>
  );
}
