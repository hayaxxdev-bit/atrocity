import { RequestIdGenerator } from "../../iq/request-id-generator.js";

export class MessageIdGenerator {
  constructor(
    private readonly requestIds = new RequestIdGenerator({
      prefix: "msg",
    }),
  ) {}

  next(): string {
    return this.requestIds.next();
  }
}
