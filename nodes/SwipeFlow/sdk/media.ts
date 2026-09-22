/**
 * Helpers for the opaque `media://<id>` durable reference (`docs/media/DESIGN.md` §3).
 * The reference is never a storage or serving URL and is resolved only against the
 * containing item/version's own `media[]` at read time — never dereferenced directly.
 */

const MEDIA_REF_PATTERN = /media:\/\/([0-9a-fA-F]{24})\b/g;

/** The canonical reference to embed in item content for a given media id. Always lowercase. */
export function mediaRef(mediaId: string): string {
  return `media://${mediaId.toLowerCase()}`;
}

/** A fresh copy of the matching pattern for `media://<id>` references embedded in content.
 *  Case-insensitive on the id; global flag, so callers use `matchAll` or hold one instance
 *  per scan rather than sharing/reusing a single regex's `lastIndex`. */
export function mediaRefPattern(): RegExp {
  return new RegExp(MEDIA_REF_PATTERN.source, MEDIA_REF_PATTERN.flags);
}

/** Every distinct media id referenced in `content`, lowercased, in first-seen order. */
export function extractMediaRefs(content: string): string[] {
  const seen = new Set<string>();
  for (const match of content.matchAll(mediaRefPattern())) {
    seen.add(match[1].toLowerCase());
  }
  return [...seen];
}
