/** Same-origin app path for post-login return. Rejects protocol-relative and auth loops. */
export function isSafeAppNextPath(next: string): boolean {
  if (!next.startsWith("/") || next.startsWith("//")) return false
  if (next.startsWith("/login") || next.startsWith("/auth")) return false
  return true
}
