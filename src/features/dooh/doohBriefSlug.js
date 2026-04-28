/** Match URL / saved slug handling (lowercase, hyphenated, ASCII). */
export function normalizeDoohBriefSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
