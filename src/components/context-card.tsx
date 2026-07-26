import type { ContextObjectView } from "@/domain/types";

import { StanceStrip } from "@/components/stance-strip";

type ContextCardProps = {
  object: ContextObjectView;
  participants: string[];
};

function semanticState(object: ContextObjectView, participants: string[]) {
  if (object.lifecycleStatus === "superseded") {
    return "bg-rule";
  }

  if (
    object.responses.some(
      (response) =>
        response.stance === "disputed" || response.stance === "rejected",
    )
  ) {
    return "bg-disputed";
  }

  if (
    participantsAccepted(object, participants) &&
    object.lifecycleStatus !== "pending"
  ) {
    return "bg-agreed";
  }

  return "bg-pending";
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

export function ContextCard({ object, participants }: ContextCardProps) {
  const isPrivate = object.visibility === "private";
  const isSuperseded = object.lifecycleStatus === "superseded";

  return (
    <article
      className={`relative overflow-hidden bg-card ${
        isPrivate ? "border border-dashed border-private" : "border border-rule"
      }`}
      data-context-id={object.id}
      data-private={isPrivate || undefined}
    >
      {!isPrivate && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-[3px] ${semanticState(object, participants)}`}
        />
      )}

      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          <span>{metadataLabel(object)}</span>
          {isPrivate && (
            <span className="border border-private px-2 py-0.5 text-private">
              Private to you
            </span>
          )}
        </div>

        <p
          className={`mt-4 max-w-[62ch] text-[17px] leading-[1.45] text-ink ${
            isSuperseded ? "opacity-45 line-through" : ""
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
      </div>

      <StanceStrip object={object} participants={participants} />
    </article>
  );
}
