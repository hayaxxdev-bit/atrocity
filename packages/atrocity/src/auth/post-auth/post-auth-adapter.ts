import type { ProtocolNode } from "../../protocol/node/index.js";
import type { IqClient } from "../../protocol/iq/index.js";
import type { MessageDeliveryTracker } from "../../protocol/features/message/message-delivery-tracker.js";
import {
  PostAuthenticationInitializer,
  type PostAuthenticationDependencies,
} from "./post-auth-initializer.js";
import type { PostAuthenticationResult } from "./post-auth-types.js";

export type PostAuthenticationIntegration = {
  readonly sendPresence: () => Promise<void>;
  readonly ensurePreKeys: () => Promise<void>;
  readonly finalizeCredentials: () => Promise<void>;
  readonly validateKeyBundle: () => Promise<void>;
};

export class PostAuthenticationAdapter {
  readonly initializer: PostAuthenticationInitializer;

  constructor(
    integration: PostAuthenticationIntegration,
  ) {
    const dependencies: PostAuthenticationDependencies = {
      ensurePreKeys: integration.ensurePreKeys,
      finalizeCredentials: integration.finalizeCredentials,
      initializePresence: integration.sendPresence,
      validateKeyBundle: integration.validateKeyBundle,
    };

    this.initializer =
      new PostAuthenticationInitializer(dependencies);
  }

  run(): Promise<PostAuthenticationResult> {
    return this.initializer.run();
  }
}
