import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

import { ContextCard } from "@/components/context-card";
import { ContextActions } from "@/components/context-actions";
import {
  getAuthorizedObjects,
  getWorkspaceParticipants,
  resolveWebViewer,
} from "@/domain/context";
import { ViewerSwitcher } from "@/components/viewer-switcher";

export const dynamic = "force-dynamic";

type WorkspacePageProps = {
  searchParams: Promise<{ as?: string | string[] }>;
};

function searchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const sql = postgres(
    getCloudflareContext().env.HYPERDRIVE.connectionString,
    {
      max: 5,
      fetch_types: false,
    },
  );
  const caller = await resolveWebViewer(
    sql,
    searchParamValue((await searchParams).as),
  );
  const [objects, participants] = await Promise.all([
    getAuthorizedObjects(sql, caller),
    getWorkspaceParticipants(sql, caller.workspaceId),
  ]);
  const viewer = caller.displayName === "Sara" ? "sara" : "fred";

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
              actions={
                <ContextActions
                  object={object}
                  viewer={viewer}
                />
              }
              key={object.id}
              object={object}
              participants={participants}
              reviewHref={`/review/${object.id}?as=${viewer}`}
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
