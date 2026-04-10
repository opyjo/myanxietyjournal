import { bibleVerses } from "../data/bibleVerses";

export function getDailyVerse(dateKey: string) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % bibleVerses.length;
  return bibleVerses[index];
}
