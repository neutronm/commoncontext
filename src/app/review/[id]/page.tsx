import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";
import postgres from "postgres";

import type { ContextObjectView, Stance } from "@/domain/types";
import { ReviewPanel } from "@/components/review-panel";
import {
  getObjectForReview,
  getWorkspaceParticipants,
  resolveWebViewer,
  respondToObject,
} from "@/domain/context";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string | string[] }>;
};

function searchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function isResponseStance(value: FormDataEntryValue | null): value is Stance {
  return (
    value === "accepted" ||
    value === "disputed" ||
    value === "acknowledged"
  );
}

async function recordResponseAction(
  formData: FormData,
): Promise<ContextObjectView> {
  "use server";

  const objectId = formData.get("objectId");

  if (typeof objectId !== "string") {
    throw new Error("Unknown proposal.");
  }

  const stance = formData.get("stance");

  if (!isResponseStance(stance)) {
    throw new Error("Choose a response.");
  }

  const viewer = formData.get("as");
  const responseText = formData.get("responseText");
  const sql = postgres(
    getCloudflareContext().env.HYPERDRIVE.connectionString,
    {
      max: 5,
      fetch_types: false,
    },
  );
  const caller = await resolveWebViewer(
    sql,
    typeof viewer === "string" ? viewer : undefined,
  );

  await respondToObject(sql, {
    caller,
    objectId,
    stance,
    responseText:
      typeof responseText === "string" && responseText.trim()
        ? responseText.trim()
        : undefined,
  });

  return getObjectForReview(sql, objectId, caller);
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
        recordResponseAction={recordResponseAction}
        viewer={viewer}
      />
    </main>
  );
}
