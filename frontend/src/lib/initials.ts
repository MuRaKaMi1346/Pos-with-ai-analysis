/**
 * 1–2 character monogram for a product / customer name (pos-ui-motion §4.2).
 * Thai names → the first character; Latin → first letter of the first two
 * words. Non-letters (emoji, punctuation) are skipped, so the result is always
 * emoji-free.
 */
export function getInitials(name: string): string {
  const trimmed = name.trim()
  const first = trimmed[0]
  if (first === undefined) return '?'

  const code = first.codePointAt(0) ?? 0
  if (code >= 0x0e00 && code <= 0x0e7f) return first // Thai block

  const initials = trimmed
    .split(/\s+/)
    .map((word) => /\p{L}/u.exec(word)?.[0])
    .filter((letter): letter is string => letter !== undefined)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return initials || '?'
}
