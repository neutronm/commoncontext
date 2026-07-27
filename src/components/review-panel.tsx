import Link from "next/link";

import { ContextActions } from "@/components/context-actions";
import {
  ContextCard,
  contextSemanticState,
  type ContextSemanticState,
} from "@/components/context-card";
import { ContextDetails } from "@/components/context-details";
import type { ContextObjectView } from "@/domain/types";
import {
  viewerDisplayName,
  type WebViewer,
} from "@/lib/context-view";

type ReviewPanelProps = {
  participants: string[];
  proposal: ContextObjectView;
  viewer: WebViewer;
};

const statusTextClass: Record<ContextSemanticState, string> = {
  agreed: "text-agreed",
  disputed: "text-disputed",
  informational: "text-ink-muted",
  pending: "text-pending",
  superseded: "text-ink-muted",
};

function metadataValue(value: string) {
  return value.replaceAll("_", " ");
}

function titleLabel(value: string) {
  const label = metadataValue(value);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function awaitingResponseLabel(object: ContextObjectView) {
  const awaitingParticipants = object.audienceNames.filter(
    (participant) =>
      participant !== object.authorName &&
      !object.responses.some(
        (response) => response.displayName === participant,
      ),
  );

  return awaitingParticipants.length > 0
    ? `Proposed by you · awaiting ${awaitingParticipants.join(", ")}`
    : "Proposed by you";
}

export function ReviewPanel({
  participants,
  proposal,
  viewer,
}: ReviewPanelProps) {
  const viewerName = viewerDisplayName(viewer);
  const viewerResponse = proposal.responses.find(
    (response) => response.displayName === viewerName,
  );
  const isAuthor = proposal.authorName === viewerName;
  const statusState = contextSemanticState(proposal, participants);
  const statusClass =
    proposal.visibility === "private"
      ? "text-private"
      : statusTextClass[statusState];
  const status =
    proposal.lifecycleStatus === "superseded"
      ? "Superseded record"
      : proposal.visibility === "private"
        ? "Private record"
        : isAuthor
          ? awaitingResponseLabel(proposal)
          : viewerResponse
            ? `Your response · ${metadataValue(viewerResponse.stance)}`
            : "Pending your response";
  const title =
    !isAuthor &&
    !viewerResponse &&
    proposal.visibility === "shared" &&
    proposal.lifecycleStatus !== "superseded"
      ? `${proposal.authorName} proposed a ${metadataValue(proposal.type)}`
      : `${titleLabel(proposal.type)} details`;

  return (
    <>
      <Link
        className="inline-flex min-h-10 items-center font-mono text-[11px] font-semibold tracking-[0.06em] text-ink uppercase underline decoration-rule underline-offset-4 hover:decoration-ink"
        href={`/workspace?as=${viewer}`}
      >
        <span aria-hidden="true">←</span>&nbsp; Back to workspace
      </Link>

      <header>
        <h1 className="mt-5 text-[28px] leading-tight font-semibold text-ink">
          {title}
        </h1>
        <p
          className={`mt-2 font-mono text-[11px] tracking-[0.06em] uppercase ${statusClass}`}
        >
          {status}
        </p>
        <div aria-hidden="true" className="mt-6 border-t border-rule" />
      </header>

      <div className="mt-7">
        <ContextCard
          actions={
            <ContextActions
              mode="review"
              object={proposal}
              viewer={viewer}
            />
          }
          object={proposal}
          participants={participants}
        />

        {!isAuthor &&
          !viewerResponse &&
          proposal.visibility === "shared" &&
          proposal.lifecycleStatus !== "superseded" && (
            <p className="mt-7 text-[17px] leading-7 text-ink">
              Nothing becomes shared context until you respond.
            </p>
          )}

        {isAuthor &&
          proposal.visibility === "shared" &&
          proposal.lifecycleStatus !== "superseded" &&
          proposal.lifecycleStatus !== "revoked" && (
            <p className="mt-7 text-[17px] leading-7 text-ink">
              Only other participants can accept or decline your proposal.
            </p>
          )}

        {(isAuthor ? proposal.visibility === "shared" : true) && (
          <p className="mt-6 text-[16px] leading-7 text-ink">
            {isAuthor ? (
              <>
                Use Propose change to suggest replacement wording.
                <br />
                The original wording is never edited or removed.
              </>
            ) : (
              <>
                Your response is recorded alongside the original statement.
                <br />
                Its wording is never edited or removed.
              </>
            )}
          </p>
        )}

        <ContextDetails object={proposal} />
      </div>
    </>
  );
}
