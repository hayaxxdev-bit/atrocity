export type Result<T, E> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export const Result = {
  ok<T>(value: T): Success<T> {
    return { ok: true, value };
  },

  err<E>(error: E): Failure<E> {
    return { ok: false, error };
  },
} as const;

export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.ok;
}
