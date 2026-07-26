"use client";

import { useState, type FormEvent } from "react";

import type { ContextObjectView, Stance } from "@/domain/types";
import {
  ContextCard,
  contextSemanticState,
  type ContextSemanticState,
} from "@/components/context-card";

type ReviewPanelProps = {
  participants: string[];
  proposal: ContextObjectView;
  recordResponseAction: (
    formData: FormData,
  ) => Promise<ContextObjectView>;
  viewer: "fred" | "sara";
};

const options: Array<{ label: string; value: Stance }> = [
  { label: "Accept", value: "accepted" },
  { label: "Dispute", value: "disputed" },
  { label: "Acknowledge", value: "acknowledged" },
];

const selectedStyles: Record<Stance, string> = {
  accepted: "border-agreed bg-agreed text-card",
  disputed: "border-disputed bg-disputed text-card",
  acknowledged: "border-ink-muted bg-ink-muted text-card",
  rejected: "border-disputed bg-disputed text-card",
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

function metadataValue(value: string) {
  return value.replaceAll("_", " ");
}

function reviewMetadataLabel(object: ContextObjectView) {
  const sharedWith = object.audienceNames.filter(
    (name) => name !== object.authorName,
  );
  const audience =
    sharedWith.length > 0
      ? `shared with ${sharedWith.join(", ")}`
      : `private to ${object.authorName}`;

  return `${metadataValue(object.type)} · proposed by ${
    object.authorName
  } · ${audience} · epistemic status ${metadataValue(
    object.epistemicStatus,
  )}`;
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
  recordResponseAction,
  viewer,
}: ReviewPanelProps) {
  const [stance, setStance] = useState<Stance | null>(null);
  const [perspective, setPerspective] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedResult, setRecordedResult] = useState<{
    object: ContextObjectView;
    viewer: "fred" | "sara";
  } | null>(null);
  const viewerName = viewer === "sara" ? "Sara" : "Fred";
  const persistedViewerResponse = proposal.responses.some(
    (response) => response.displayName === viewerName,
  );
  const recordedObject = persistedViewerResponse
    ? proposal
    : recordedResult?.viewer === viewer &&
        recordedResult.object.id === proposal.id
      ? recordedResult.object
      : null;
  const statusObject = recordedObject ?? proposal;
  const statusState = contextSemanticState(statusObject, participants);

  async function recordResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stance || isRecording) {
      return;
    }

    setIsRecording(true);

    try {
      const formData = new FormData(event.currentTarget);
      const nextObject = await recordResponseAction(formData);
      setRecordedResult({ object: nextObject, viewer });
    } finally {
      setIsRecording(false);
    }
  }

  return (
    <>
      <header>
        <h1 className="text-[28px] leading-tight font-semibold text-ink">
          {proposal.authorName} proposed a{" "}
          {proposal.type.replaceAll("_", " ")}
        </h1>
        <p
          aria-live="polite"
          className={`mt-2 font-mono text-[11px] tracking-[0.06em] uppercase ${statusTextClass[statusState]}`}
          role={recordedObject ? "status" : undefined}
        >
          {recordedObject ? "Response recorded" : "Pending your response"}
        </p>
        <div aria-hidden="true" className="mt-6 border-t border-rule" />
      </header>

      <div className="mt-7">
        {recordedObject ? (
          <ContextCard object={recordedObject} participants={participants} />
        ) : (
          <ReviewForm
            perspective={perspective}
            proposal={proposal}
            recordResponse={recordResponse}
            isRecording={isRecording}
            setPerspective={setPerspective}
            setStance={setStance}
            stance={stance}
            viewer={viewer}
          />
        )}
      </div>
    </>
  );
}

type ReviewFormProps = {
  isRecording: boolean;
  perspective: string;
  proposal: ContextObjectView;
  recordResponse: (event: FormEvent<HTMLFormElement>) => void;
  setPerspective: (value: string) => void;
  setStance: (stance: Stance) => void;
  stance: Stance | null;
  viewer: "fred" | "sara";
};

function ReviewForm({
  isRecording,
  perspective,
  proposal,
  recordResponse,
  setPerspective,
  setStance,
  stance,
  viewer,
}: ReviewFormProps) {
  return (
    <div>
      <article className="border border-rule bg-card px-5 py-5">
        <p className="font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          {reviewMetadataLabel(proposal)}
        </p>
        <p className="mt-5 text-[17px] leading-[1.45] text-ink">
          {proposal.text}
        </p>
        <p className="mt-5 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          Proposed {originCopy(proposal)} ·{" "}
          <time dateTime={proposal.createdAt}>
            {createdAtLabel(proposal.createdAt)}
          </time>
        </p>
      </article>

      <p className="mt-7 text-[17px] leading-7 text-ink">
        Nothing becomes shared context until you respond.
      </p>

      <form className="mt-6" method="post" onSubmit={recordResponse}>
        <input name="as" type="hidden" value={viewer} />
        <input name="objectId" type="hidden" value={proposal.id} />
        <input name="stance" type="hidden" value={stance ?? ""} />

        <fieldset>
          <legend className="sr-only">Choose your response</legend>
          <div className="flex flex-wrap gap-3">
            {options.map((option) => {
              const isSelected = stance === option.value;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`min-h-10 border px-5 py-2.5 text-[15px] font-semibold ${
                    isSelected
                      ? selectedStyles[option.value]
                      : "border-rule bg-card text-ink"
                  }`}
                  key={option.value}
                  name="stance"
                  onClick={() => setStance(option.value)}
                  type="button"
                  value={option.value}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label
          className="mt-7 block font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase"
          htmlFor="perspective"
        >
          Add your perspective (optional)
        </label>
        <textarea
          className="mt-2 min-h-32 w-full resize-y border border-rule bg-card px-4 py-3 text-[16px] leading-6 text-ink"
          id="perspective"
          name="responseText"
          onChange={(event) => setPerspective(event.target.value)}
          value={perspective}
        />

        <p className="mt-6 text-[16px] leading-7 text-ink">
          Your response is recorded alongside Fred&apos;s statement.
          <br />
          His wording is never edited or removed.
        </p>

        <div className="mt-7 flex justify-end">
          <button
            className="min-h-11 border border-ink bg-ink px-5 py-3 text-[15px] font-semibold text-card disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!stance || isRecording}
            type="submit"
          >
            Record response
          </button>
        </div>
      </form>
    </div>
  );
}
