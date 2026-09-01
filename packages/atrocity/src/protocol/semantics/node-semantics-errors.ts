import { AtrocityError } from "../../foundation/errors/index.js";

export type NodeSemanticsErrorCode =
  | "NODE_NOT_FOUND"
  | "ATTRIBUTE_NOT_FOUND"
  | "INVALID_NODE";

export class NodeSemanticsError extends AtrocityError {
  constructor(
    code: NodeSemanticsErrorCode,
    message: string,
  ) {
    super(code, message);
    this.name = "NodeSemanticsError";
  }
}
