import type { ReactNode } from "react";

import type { ContextObjectView } from "@/domain/types";

type ContextDetailsProps = {
  object: ContextObjectView;
};

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
});

function displayValue(value: string) {
  return value.replaceAll("_", " ");
}

function timestampLabel(value: string) {
  return timestampFormatter.format(new Date(value));
}

function originLabel(object: ContextObjectView) {
  if (object.origin === "assistant") {
    return `${object.authorName}'s assistant`;
  }

  if (object.origin === "web") {
    return "Web";
  }

  return "Seed record";
}

function DetailRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-5">
      <dt className="font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="text-[15px] leading-6 text-ink">{children}</dd>
    </div>
  );
}

export function ContextDetails({ object }: ContextDetailsProps) {
  return (
    <>
      <section
        aria-labelledby="record-details-heading"
        className="mt-7 border border-rule bg-card"
      >
        <h2
          className="border-b border-rule px-5 py-4 font-mono text-[11px] leading-4 font-semibold tracking-[0.06em] text-ink uppercase"
          id="record-details-heading"
        >
          Record details
        </h2>
        <dl className="divide-y divide-rule">
          <DetailRow label="Type">{displayValue(object.type)}</DetailRow>
          <DetailRow label="Epistemic status">
            {displayValue(object.epistemicStatus)}
          </DetailRow>
          <DetailRow label="Lifecycle">
            {displayValue(object.lifecycleStatus)}
          </DetailRow>
          <DetailRow label="Visibility">
            {object.visibility === "private"
              ? `Private to ${object.authorName}`
              : "Shared"}
          </DetailRow>
          <DetailRow label="Author">{object.authorName}</DetailRow>
          <DetailRow label="Owner">{object.ownerName}</DetailRow>
          <DetailRow label="Audience">
            {object.audienceNames.join(", ")}
          </DetailRow>
          <DetailRow label="Origin">{originLabel(object)}</DetailRow>
          <DetailRow label="Created">
            <time dateTime={object.createdAt}>
              {timestampLabel(object.createdAt)}
            </time>
          </DetailRow>
          {object.sourceReference && (
            <DetailRow label="Source">{object.sourceReference}</DetailRow>
          )}
          {object.supersedesText && (
            <DetailRow label="Supersedes">
              &ldquo;{object.supersedesText}&rdquo;
            </DetailRow>
          )}
        </dl>
      </section>

      {object.responses.length > 0 && (
        <section
          aria-labelledby="response-history-heading"
          className="mt-7 border border-rule bg-card"
        >
          <h2
            className="border-b border-rule px-5 py-4 font-mono text-[11px] leading-4 font-semibold tracking-[0.06em] text-ink uppercase"
            id="response-history-heading"
          >
            Response history
          </h2>
          <div className="divide-y divide-rule">
            {object.responses.map((response) => (
              <article
                className="px-5 py-4"
                key={`${response.displayName}:${response.createdAt}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <p className="font-mono text-[11px] leading-4 tracking-[0.06em] text-ink uppercase">
                    {response.displayName} ·{" "}
                    {displayValue(response.stance)}
                  </p>
                  <time
                    className="font-mono text-[11px] leading-4 tracking-[0.06em] text-ink-muted uppercase"
                    dateTime={response.createdAt}
                  >
                    {timestampLabel(response.createdAt)}
                  </time>
                </div>
                {response.responseText && (
                  <p className="mt-3 text-[15px] leading-6 text-ink">
                    {response.responseText}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
