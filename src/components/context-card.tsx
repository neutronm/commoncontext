import Link from "next/link";
import type { ReactNode } from "react";

import { StanceStrip } from "@/components/stance-strip";
import type { ContextObjectView } from "@/domain/types";

type ContextCardProps = {
  actions?: ReactNode;
  href?: string;
  object: ContextObjectView;
  participants: string[];
};

export type ContextSemanticState =
  | "agreed"
  | "disputed"
  | "informational"
  | "pending"
  | "superseded";

export function contextSemanticState(
  object: ContextObjectView,
  participants: string[],
): ContextSemanticState {
  if (object.lifecycleStatus === "superseded") {
    return "superseded";
  }

  if (
    object.responses.some(
      (response) =>
        response.stance === "disputed" || response.stance === "rejected",
    )
  ) {
    return "disputed";
  }

  if (object.lifecycleStatus === "pending") {
    return "pending";
  }

  if (
    object.responses.some((response) => response.stance === "acknowledged")
  ) {
    return "informational";
  }

  if (participantsAccepted(object, participants)) {
    return "agreed";
  }

  return "pending";
}

function participantsAccepted(
  object: ContextObjectView,
  participants: string[],
) {
  return (
    participants.length > 0 &&
    participants.every((participant) =>
      object.responses.some(
        (response) =>
          response.displayName === participant &&
          response.stance === "accepted",
      ),
    )
  );
}

function metadataLabel(object: ContextObjectView) {
  const type = object.type.replaceAll("_", " ");
  const sharedWith = object.audienceNames.filter(
    (name) => name !== object.authorName,
  );

  if (object.visibility === "private") {
    return `${type} · authored by ${object.authorName} · owned by ${object.ownerName}`;
  }

  return `${type} · authored by ${object.authorName} · owned by ${object.ownerName} · shared with ${sharedWith.join(", ")}`;
}

const semanticGutterClass: Record<ContextSemanticState, string> = {
  agreed: "bg-agreed",
  disputed: "bg-disputed",
  informational: "bg-ink-muted",
  pending: "bg-pending",
  superseded: "bg-ink-muted",
};

export function ContextCard({
  actions,
  href,
  object,
  participants,
}: ContextCardProps) {
  const isPrivate = object.visibility === "private";
  const isSuperseded = object.lifecycleStatus === "superseded";
  const lifecycle = object.lifecycleStatus.replaceAll("_", " ");
  const content = (
    <div className="px-5 pt-5 pb-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
        <span>
          {metadataLabel(object)} · lifecycle {lifecycle}
        </span>
        {isPrivate && (
          <span className="border border-private px-2 py-0.5 text-private">
            Private to you
          </span>
        )}
      </div>

      <p
        className={`mt-4 max-w-[62ch] text-[17px] leading-[1.45] text-ink ${
          isSuperseded ? "opacity-60 line-through" : ""
        }`}
      >
        {object.text}
      </p>

      {object.responses.some(
        (response) => response.stance === "acknowledged",
      ) && (
        <p className="mt-4 text-[15px] leading-6 text-ink-muted">
          Acknowledged is not agreement.
        </p>
      )}

      {(object.supersedesText || object.sourceReference) && (
        <div className="mt-5 space-y-2 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          {object.supersedesText && (
            <p>
              <span className="font-semibold">Supersedes</span>{" "}
              &ldquo;{object.supersedesText}&rdquo;
            </p>
          )}
          {object.sourceReference && (
            <p>
              <span className="font-semibold">Source</span>{" "}
              {object.sourceReference}
            </p>
          )}
        </div>
      )}

      {href && (
        <p className="mt-5 font-mono text-[11px] leading-4 font-semibold tracking-[0.06em] text-ink uppercase">
          View details <span aria-hidden="true">→</span>
        </p>
      )}
    </div>
  );

  return (
    <article
      className={`relative overflow-hidden bg-card ${
        isPrivate
          ? "border border-dashed border-private"
          : "border border-rule"
      }`}
      data-context-id={object.id}
      data-private={isPrivate || undefined}
    >
      {!isPrivate && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-[3px] ${
            semanticGutterClass[contextSemanticState(object, participants)]
          }`}
        />
      )}

      {href ? (
        <Link
          aria-label={`View details for ${object.type.replaceAll("_", " ")}: ${object.text}`}
          className="group block hover:outline hover:outline-1 hover:outline-offset-[-1px] hover:outline-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
          href={href}
        >
          {content}
        </Link>
      ) : (
        content
      )}

      {actions}
      <StanceStrip object={object} participants={participants} />
    </article>
  );
}
