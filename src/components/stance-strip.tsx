import type { ContextObjectView } from "@/domain/types";

type StanceStripProps = {
  object: ContextObjectView;
  participants: string[];
};

const stanceColor = {
  accepted: "text-agreed",
  acknowledged: "text-ink-muted",
  disputed: "text-disputed",
  rejected: "text-disputed",
  awaiting: "text-pending",
  inaccessible: "text-private italic",
} as const;

export function StanceStrip({ object, participants }: StanceStripProps) {
  return (
    <div>
      <div className="grid grid-cols-2 border-t border-rule bg-paper">
        {participants.map((participant, index) => {
          const hasAccess = object.audienceNames.includes(participant);
          const response = object.responses.find(
            (item) => item.displayName === participant,
          );
          const stance = !hasAccess
            ? "no access"
            : (response?.stance ?? "awaiting response");
          const color = !hasAccess
            ? stanceColor.inaccessible
            : response
              ? stanceColor[response.stance]
              : stanceColor.awaiting;

          return (
            <div
              className={`min-w-0 px-4 py-3 font-mono text-[11px] leading-4 tracking-[0.06em] uppercase ${
                index > 0 ? "border-l border-rule" : ""
              }`}
              key={participant}
            >
              <span className="text-ink-muted">{participant}</span>
              <span aria-hidden="true" className="text-ink-muted">
                {" "}
                ·{" "}
              </span>
              <span className={color}>{stance}</span>
            </div>
          );
        })}
      </div>

      {participants.map((participant) => {
        const response = object.responses.find(
          (item) =>
            item.displayName === participant && item.responseText !== null,
        );

        if (!response?.responseText) {
          return null;
        }

        return (
          <p
            className="border-t border-rule px-4 py-3 text-[15px] leading-6 text-ink"
            key={participant}
          >
            <span className="font-semibold">{participant}:</span>{" "}
            {response.responseText}
          </p>
        );
      })}
    </div>
  );
}
