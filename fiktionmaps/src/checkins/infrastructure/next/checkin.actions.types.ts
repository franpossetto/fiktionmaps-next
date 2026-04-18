export type CheckinResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
