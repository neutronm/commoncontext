import { notFound } from "next/navigation";

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
        viewer={viewer}
      />
    </main>
  );
}
