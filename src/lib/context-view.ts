import type { ContextObjectView } from "../domain/types";

export type WebViewer = "fred" | "sara";

const contextObjectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isContextObjectId(value: string) {
  return contextObjectIdPattern.test(value);
}

export function viewerDisplayName(viewer: WebViewer) {
  return viewer === "sara" ? "Sara" : "Fred";
}

export function canViewerRespondToObject(
  object: ContextObjectView,
  viewerName: string,
) {
  return (
    object.lifecycleStatus === "pending" &&
    object.authorName !== viewerName &&
    object.audienceNames.includes(viewerName) &&
    !object.responses.some(
      (response) => response.displayName === viewerName,
    )
  );
}
