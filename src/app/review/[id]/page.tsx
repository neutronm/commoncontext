import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";
import postgres from "postgres";

import type { ContextObjectView } from "@/domain/types";
import { ReviewPanel } from "@/components/review-panel";
import {
  getObjectForReview,
  getWorkspaceParticipants,
  resolveWebViewer,
} from "@/domain/context";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string | string[] }>;
};

function searchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const { id } = await params;
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
  let proposal: ContextObjectView;

  try {
    proposal = await getObjectForReview(sql, id, caller);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Context object not found or not authorized"
    ) {
      notFound();
    }
    throw error;
  }

  const participants = await getWorkspaceParticipants(
    sql,
    caller.workspaceId,
  );
  const viewer = caller.displayName === "Sara" ? "sara" : "fred";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-5 py-10 sm:px-7 sm:py-14">
      <ReviewPanel
        key={`${proposal.id}:${viewer}`}
        participants={participants}
        proposal={proposal}
        viewer={viewer}
      />
    </main>
  );
}
