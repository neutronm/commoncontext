"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import type { ContextObjectView, Stance } from "@/domain/types";
import {
  ContextCard,
  contextSemanticState,
  type ContextSemanticState,
} from "@/components/context-card";
import { ContextDetails } from "@/components/context-details";
import {
  canViewerRespondToObject,
  viewerDisplayName,
  type WebViewer,
} from "@/lib/context-view";

type ReviewPanelProps = {
  participants: string[];
  proposal: ContextObjectView;
  recordResponseAction: (
    formData: FormData,
  ) => Promise<ContextObjectView>;
  viewer: WebViewer;
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

function metadataValue(value: string) {
  return value.replaceAll("_", " ");
}

function titleLabel(value: string) {
  const label = metadataValue(value);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

const semanticStatusLabel: Record<ContextSemanticState, string> = {
  agreed: "Agreed",
  disputed: "Disputed",
  informational: "Acknowledged",
  pending: "Pending",
  superseded: "Superseded",
};

function awaitingResponseLabel(object: ContextObjectView) {
  const awaitingParticipant = object.audienceNames.find(
    (participant) =>
      participant !== object.authorName &&
      !object.responses.some(
        (response) => response.displayName === participant,
      ),
  );

  return awaitingParticipant
    ? `Awaiting ${awaitingParticipant}'s response`
    : "Awaiting response";
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
    viewer: WebViewer;
  } | null>(null);
  const viewerName = viewerDisplayName(viewer);
  const recordedObject =
    recordedResult?.viewer === viewer &&
    recordedResult.object.id === proposal.id
      ? recordedResult.object
      : null;
  const currentObject = recordedObject ?? proposal;
  const canRespond = canViewerRespondToObject(currentObject, viewerName);
  const statusState = contextSemanticState(currentObject, participants);
  const statusClass =
    currentObject.visibility === "private"
      ? "text-private"
      : statusTextClass[statusState];
  const statusLabel = recordedObject
    ? "Response recorded"
    : canRespond
      ? "Pending your response"
      : currentObject.lifecycleStatus === "pending" &&
          currentObject.authorName === viewerName
        ? awaitingResponseLabel(currentObject)
        : currentObject.visibility === "private"
          ? "Private record"
          : semanticStatusLabel[statusState];

  async function recordResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stance || isRecording || !canRespond) {
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
      <Link
        className="inline-flex min-h-10 items-center font-mono text-[11px] font-semibold tracking-[0.06em] text-ink uppercase underline decoration-rule underline-offset-4 hover:decoration-ink"
        href={`/workspace?as=${viewer}`}
      >
        <span aria-hidden="true">←</span>&nbsp; Back to workspace
      </Link>

      <header>
        <h1 className="mt-5 text-[28px] leading-tight font-semibold text-ink">
          {canRespond
            ? `${currentObject.authorName} proposed a ${metadataValue(
                currentObject.type,
              )}`
            : `${titleLabel(currentObject.type)} details`}
        </h1>
        <p
          aria-live="polite"
          className={`mt-2 font-mono text-[11px] tracking-[0.06em] uppercase ${statusClass}`}
          role={recordedObject ? "status" : undefined}
        >
          {statusLabel}
        </p>
        <div aria-hidden="true" className="mt-6 border-t border-rule" />
      </header>

      <div className="mt-7">
        <ContextCard object={currentObject} participants={participants} />

        {canRespond && (
          <ReviewForm
            perspective={perspective}
            proposal={currentObject}
            recordResponse={recordResponse}
            isRecording={isRecording}
            setPerspective={setPerspective}
            setStance={setStance}
            stance={stance}
            viewer={viewer}
          />
        )}

        <ContextDetails object={currentObject} />
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
  viewer: WebViewer;
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
    <div className="mt-7">
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
          Your response is recorded alongside {proposal.authorName}&apos;s
          statement.
          <br />
          {proposal.authorName}&apos;s wording is never edited or removed.
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
