export type WebViewer = "fred" | "sara";

const contextObjectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isContextObjectId(value: string) {
  return contextObjectIdPattern.test(value);
}

export function viewerDisplayName(viewer: WebViewer) {
  return viewer === "sara" ? "Sara" : "Fred";
}
