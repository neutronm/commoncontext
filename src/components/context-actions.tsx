"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  updateContextAction,
  type ContextActionState,
} from "@/app/context-actions";
import type { ContextObjectView } from "@/domain/types";

type ContextActionsProps = {
  mode?: "compact" | "review";
  object: ContextObjectView;
  viewer: "fred" | "sara";
};

const initialState: ContextActionState = {
  status: "idle",
  message: "",
};

function responseLabel(stance: string) {
  if (stance === "accepted") return "accepted";
  if (stance === "rejected") return "declined";
  return stance;
}

export function ContextActions({
  mode = "compact",
  object,
  viewer,
}: ContextActionsProps) {
  const [state, formAction, pending] = useActionState(
    updateContextAction,
    initialState,
  );
  const [showChangeForm, setShowChangeForm] = useState(false);
  const viewerName = viewer === "sara" ? "Sara" : "Fred";
  const currentResponse = object.responses.find(
    (response) => response.displayName === viewerName,
  );
  const canAct =
    object.visibility === "shared" &&
    object.lifecycleStatus !== "superseded" &&
    object.lifecycleStatus !== "revoked";
  const isAuthor = object.authorName === viewerName;

  if (!canAct) return null;

  const accepted = currentResponse?.stance === "accepted";
  const declined =
    currentResponse?.stance === "rejected" ||
    currentResponse?.stance === "disputed";

  return (
    <section
      aria-label={`Actions for ${object.text}`}
      className="border-t border-rule px-5 py-4"
    >
      {isAuthor ? (
        <p className="mb-3 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          Your proposal · only other participants can accept or decline
        </p>
      ) : currentResponse ? (
        <p className="mb-3 font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
          Your response · {responseLabel(currentResponse.stance)}
        </p>
      ) : (
        <p className="mb-3 font-mono text-[11px] leading-4 tracking-[0.06em] text-pending uppercase">
          Your response · awaiting response
        </p>
      )}

      <form action={formAction}>
        <input name="as" type="hidden" value={viewer} />
        <input name="objectId" type="hidden" value={object.id} />
        {mode === "review" && !isAuthor ? (
          <>
            <label
              className="mb-2 block font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase"
              htmlFor={`response-${object.id}`}
            >
              Add your perspective (optional)
            </label>
            <textarea
              className="mb-4 min-h-24 w-full resize-y border border-rule bg-card px-4 py-3 text-[16px] leading-6 text-ink"
              defaultValue={currentResponse?.responseText ?? ""}
              id={`response-${object.id}`}
              name="responseText"
            />
          </>
        ) : !isAuthor ? (
          currentResponse?.responseText && (
            <input
              name="responseText"
              type="hidden"
              value={currentResponse.responseText}
            />
          )
        ) : null}

        <fieldset>
          <legend className="sr-only">
            {isAuthor ? "Change your proposal" : "Choose your response"}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {!isAuthor && (
              <>
                <button
                  aria-pressed={accepted}
                  className={`min-h-10 border px-4 py-2 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    accepted
                      ? "border-agreed bg-agreed text-card"
                      : "border-rule bg-card text-ink"
                  }`}
                  disabled={pending || accepted}
                  name="intent"
                  type="submit"
                  value="accept"
                >
                  {pending ? "Recording…" : "Accept"}
                </button>
                <button
                  aria-pressed={declined}
                  className={`min-h-10 border px-4 py-2 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    declined
                      ? "border-disputed bg-disputed text-card"
                      : "border-rule bg-card text-ink"
                  }`}
                  disabled={pending || declined}
                  name="intent"
                  type="submit"
                  value="decline"
                >
                  {pending ? "Recording…" : "Decline"}
                </button>
              </>
            )}
            <button
              aria-expanded={showChangeForm}
              className="min-h-10 border border-rule bg-card px-4 py-2 text-[15px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              onClick={() => setShowChangeForm((current) => !current)}
              type="button"
            >
              Propose change
            </button>
          </div>
        </fieldset>
      </form>

      {showChangeForm && (
        <form action={formAction} className="mt-4 border-t border-rule pt-4">
          <input name="as" type="hidden" value={viewer} />
          <input name="objectId" type="hidden" value={object.id} />
          <label
            className="block font-mono text-[11px] tracking-[0.06em] text-ink-muted uppercase"
            htmlFor={`replacement-${object.id}`}
          >
            Replacement wording
          </label>
          <textarea
            className="mt-2 min-h-28 w-full resize-y border border-rule bg-card px-4 py-3 text-[16px] leading-6 text-ink"
            id={`replacement-${object.id}`}
            name="replacementText"
            placeholder="Write the complete replacement statement."
            required
          />
          <p className="mt-3 text-[14px] leading-6 text-ink-muted">
            The original stays unchanged and current until everyone accepts
            this replacement.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <button
              className="min-h-10 border border-rule bg-card px-4 py-2 text-[15px] font-semibold text-ink"
              onClick={() => setShowChangeForm(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-10 border border-ink bg-ink px-4 py-2 text-[15px] font-semibold text-card disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              name="intent"
              type="submit"
              value="propose_change"
            >
              {pending ? "Proposing…" : "Propose replacement"}
            </button>
          </div>
        </form>
      )}

      {state.status !== "idle" && (
        <p
          aria-live="polite"
          className={`mt-4 text-[14px] leading-6 ${
            state.status === "error" ? "text-disputed" : "text-agreed"
          }`}
          role="status"
        >
          {state.message}{" "}
          {state.reviewPath && (
            <Link
              className="font-semibold underline underline-offset-2"
              href={state.reviewPath}
            >
              Open its review page.
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
