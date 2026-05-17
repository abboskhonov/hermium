/**
 * IME composition detection for Enter-key handling.
 * Prevents sending the message while the user is still composing
 * CJK characters.
 */

export function isImeComposing(e: React.KeyboardEvent): boolean {
  // @ts-expect-error — nativeEvent may have isComposing
  return e.nativeEvent?.isComposing === true
}
