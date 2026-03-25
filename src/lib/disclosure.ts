const KEY_PREFIX = "anxiety-journal-ai-disclosure";

export function hasAcceptedAnalysisDisclosure(uid: string) {
  return window.localStorage.getItem(`${KEY_PREFIX}:${uid}`) === "accepted";
}

export function acceptAnalysisDisclosure(uid: string) {
  window.localStorage.setItem(`${KEY_PREFIX}:${uid}`, "accepted");
}
