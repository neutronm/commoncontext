import type { ContextObjectView } from "@/domain/types";
import { ContextActions } from "@/components/context-actions";
import {
  ContextCard,
  contextSemanticState,
  type ContextSemanticState,
} from "@/components/context-card";

type ReviewPanelProps = {
  participants: string[];
  proposal: ContextObjectView;
  viewer: "fred" | "sara";
};

const statusTextClass: Record<ContextSemanticState, string> = {
  agreed: "text-agreed",
  disputed: "text-disputed",
  informational: "text-ink-muted",
  pending: "text-pending",
  superseded: "text-ink-muted",
};

function originCopy(object: ContextObjectView) {
  if (object.origin === "assistant") {
    return `through ${object.authorName}'s assistant`;
  }

  if (object.origin === "web") {
    return "on the web";
  }

  return "from the shared record";
}

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
});

function createdAtLabel(createdAt: string) {
  return timestampFormatter.format(new Date(createdAt));
}

export function ReviewPanel({
  participants,
  proposal,
  viewer,
}: ReviewPanelProps) {
  const viewerName = viewer === "sara" ? "Sara" : "Fred";
  const viewerResponse = proposal.responses.find(
    (response) => response.displayName === viewerName,
  );
  const statusState = contextSemanticState(proposal, participants);
  const status =
    proposal.lifecycleStatus === "superseded"
      ? "Superseded record"
      : viewerResponse
        ? `Your response · ${viewerResponse.stance.replaceAll("_", " ")}`
        : "Pending your response";

  return (
    <>
      <header>
        <h1 className="text-[28px] leading-tight font-semibold text-ink">
          {proposal.authorName} proposed a{" "}
          {proposal.type.replaceAll("_", " ")}
        </h1>
        <p
          className={`mt-2 font-mono text-[11px] tracking-[0.06em] uppercase ${statusTextClass[statusState]}`}
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

        <p className="mt-4 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          Proposed {originCopy(proposal)} ·{" "}
          <time dateTime={proposal.createdAt}>
            {createdAtLabel(proposal.createdAt)}
          </time>
        </p>

        {!viewerResponse && proposal.lifecycleStatus !== "superseded" && (
          <p className="mt-7 text-[17px] leading-7 text-ink">
            Nothing becomes shared context until you respond.
          </p>
        )}

        <p className="mt-6 text-[16px] leading-7 text-ink">
          Your response is recorded alongside the original statement.
          <br />
          Its wording is never edited or removed.
        </p>
      </div>
    </>
  );
}
