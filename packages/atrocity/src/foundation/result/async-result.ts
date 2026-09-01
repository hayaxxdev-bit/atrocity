import type { Result } from "./result.js";

export type AsyncResult<T, E> = Promise<Result<T, E>>;
