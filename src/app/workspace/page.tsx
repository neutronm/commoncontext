import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

import { ContextCard } from "@/components/context-card";
import {
  getAuthorizedObjects,
  getWorkspaceParticipants,
  resolveWebViewer,
} from "@/domain/context";
import { WorkspaceShell } from "@/components/workspace-shell";

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
    <WorkspaceShell itemCount={objects.length} viewer={viewer}>
      {objects.length > 0 ? (
        <div className="mt-7 space-y-5">
          {objects.map((object) => (
            <ContextCard
              href={`/review/${object.id}?as=${viewer}`}
              key={object.id}
              object={object}
              participants={participants}
            />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-[17px] leading-7 text-ink">
          Nothing has been shared with you yet.
        </p>
      )}
    </WorkspaceShell>
  );
}
