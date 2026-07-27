import type { ContextObjectView } from "@/domain/types";

export function contextActionAvailability(
  object: ContextObjectView,
  viewerName: string,
) {
  const canAct =
    object.visibility === "shared" &&
    object.lifecycleStatus !== "superseded" &&
    object.lifecycleStatus !== "revoked";

  return {
    canProposeChange: canAct,
    canRespond: canAct && object.authorName !== viewerName,
  };
}
