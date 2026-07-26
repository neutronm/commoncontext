import { notFound } from "next/navigation";

import type { ContextObjectView, Stance } from "@/domain/types";
import { mockParticipants, mockPendingProposal } from "@/components/mock-data";
import { ReviewPanel } from "@/components/review-panel";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string | string[] }>;
};

function resolveViewer(value: string | string[] | undefined) {
  return value === "sara" ? ("sara" as const) : ("fred" as const);
}

function isResponseStance(value: FormDataEntryValue | null): value is Stance {
  return (
    value === "accepted" ||
    value === "disputed" ||
    value === "acknowledged"
  );
}

async function recordMockResponseAction(
  formData: FormData,
): Promise<ContextObjectView> {
  "use server";

  if (formData.get("objectId") !== mockPendingProposal.id) {
    throw new Error("Unknown proposal.");
  }

  const stance = formData.get("stance");

  if (!isResponseStance(stance)) {
    throw new Error("Choose a response.");
  }

  const viewer = resolveViewer(
    typeof formData.get("as") === "string"
      ? (formData.get("as") as string)
      : undefined,
  );
  const viewerName = viewer === "sara" ? "Sara" : "Fred";
  const responseText = formData.get("responseText");

  return {
    ...mockPendingProposal,
    lifecycleStatus: "active",
    responses: [
      ...mockPendingProposal.responses.filter(
        (response) => response.displayName !== viewerName,
      ),
      {
        displayName: viewerName,
        stance,
        responseText:
          typeof responseText === "string" && responseText.trim()
            ? responseText.trim()
            : null,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export default async function ReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const { id } = await params;
  const viewer = resolveViewer((await searchParams).as);

  if (id !== mockPendingProposal.id) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-5 py-10 sm:px-7 sm:py-14">
      <ReviewPanel
        participants={mockParticipants}
        proposal={mockPendingProposal}
        recordResponseAction={recordMockResponseAction}
        viewer={viewer}
      />
    </main>
  );
}
