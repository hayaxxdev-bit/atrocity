
import {
  buildLoginPayload,
  buildRegistrationPayload,
  type LoginPayloadConfig,
  type RegistrationPayloadConfig,
} from "./client-payload-builder.js";
import { ClientPayloadCodec } from "./client-payload-codec.js";
import {
  validateLoginPayload,
  validateRegistrationPayload,
} from "./client-payload-validator.js";
import type { ClientPayload } from "./client-payload-types.js";

export class ClientPayloadAdapter {
  constructor(private readonly codec = new ClientPayloadCodec()) {}

  buildLogin(config: LoginPayloadConfig): ClientPayload {
    const payload = buildLoginPayload(config);
    validateLoginPayload(payload);
    return payload;
  }

  buildRegistration(config: RegistrationPayloadConfig): ClientPayload {
    const payload = buildRegistrationPayload(config);
    validateRegistrationPayload(payload);
    return payload;
  }

  encodeLogin(config: LoginPayloadConfig): Uint8Array {
    return this.codec.encode(this.buildLogin(config));
  }

  encodeRegistration(config: RegistrationPayloadConfig): Uint8Array {
    return this.codec.encode(this.buildRegistration(config));
  }

  roundTrip(payload: ClientPayload): ClientPayload {
    return this.codec.decode(this.codec.encode(payload));
  }
}
