import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AuthenticationCredentials } from "../credentials/credential-types.js";
import type { CredentialRecord } from "./credential-record.js";
import { CredentialBinaryCodec } from "./credential-codec.js";
import { SessionPersistenceError } from "../../signal/persistence/session-persistence-errors.js";
import type { SignalSessionRecord } from "../../signal/persistence/session-record.js";
import { SignalSessionBinaryCodec } from "../../signal/persistence/binary-codec.js";
import { FileSignalSessionStore } from "../../signal/persistence/file-session-store.js";

export type AtrocityStateStoreOptions = {
  readonly directory: string;
  readonly sessionDirectory?: string;
};

/**
 * Small aggregate store boundary for M1.32.
 *
 * It deliberately does not expose raw filesystem paths to consumers.
 * Credentials and sessions remain separate records, while callers receive
 * one domain-level store for lifecycle operations.
 */
export class AtrocityStateStore {
  private readonly credentialCodec = new CredentialBinaryCodec();
  private readonly sessionStore: FileSignalSessionStore;
  private mutation: Promise<void> = Promise.resolve();

  constructor(private readonly options: AtrocityStateStoreOptions) {
    this.sessionStore = new FileSignalSessionStore(
      options.sessionDirectory ??
        join(options.directory, "sessions"),
    );
  }

  async loadCredentials(): Promise<AuthenticationCredentials | undefined> {
    const path = join(this.options.directory, "credentials.record");
    try {
      const bytes = await fs.readFile(path);
      return this.credentialCodec.decode(
        new Uint8Array(bytes),
      ).credentials;
    } catch (error) {
      const code = error as NodeJS.ErrnoException;
      if (code?.code === "ENOENT") return undefined;
      if (error instanceof SessionPersistenceError) throw error;

      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_IO",
        "Failed to load credentials.",
        { cause: error },
      );
    }
  }

  async saveCredentials(
    credentials: AuthenticationCredentials,
  ): Promise<void> {
    await this.enqueue(async () => {
      const path = join(this.options.directory, "credentials.record");
      const record: CredentialRecord = Object.freeze({
        schemaVersion: 1,
        credentials: cloneCredentials(credentials),
        updatedAt: Date.now(),
      });

      const bytes = this.credentialCodec.encode(record);
      await this.atomicWrite(path, bytes);
    });
  }

  async loadSession(
    sessionId: string,
  ): Promise<SignalSessionRecord | undefined> {
    return this.sessionStore.load(sessionId);
  }

  async saveSession(record: SignalSessionRecord): Promise<void> {
    await this.enqueue(async () => {
      await this.sessionStore.save(record);
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.enqueue(async () => {
      await this.sessionStore.delete(sessionId);
    });
  }

  async listSessions(): Promise<readonly string[]> {
    return this.sessionStore.list();
  }

  async transaction(
    operation: (store: AtrocityStateStore) => Promise<void>,
  ): Promise<void> {
    await this.enqueue(() => operation(this));
  }

  private async enqueue(
    operation: () => Promise<void>,
  ): Promise<void> {
    const next = this.mutation.then(operation, operation);
    this.mutation = next.catch(() => undefined);
    return next;
  }

  private async atomicWrite(
    path: string,
    bytes: Uint8Array,
  ): Promise<void> {
    const directory = this.options.directory;
    const temp = `${path}.${process.pid}.${Date.now()}.tmp`;

    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(temp, bytes, { mode: 0o600 });
      await fs.rename(temp, path);
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => undefined);
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_IO",
        "Failed to atomically write state record.",
        { cause: error },
      );
    }
  }
}

function cloneCredentials(
  credentials: AuthenticationCredentials,
): AuthenticationCredentials {
  return Object.freeze({
    device: Object.freeze({
      deviceId: credentials.device.deviceId.slice(),
      registrationId: credentials.device.registrationId,
      identityKeyPublic: credentials.device.identityKeyPublic.slice(),
      identityKeyPrivate: credentials.device.identityKeyPrivate.slice(),
    }),
    identitySigningKey: Object.freeze({
      publicKey: credentials.identitySigningKey.publicKey.slice(),
      privateKey: credentials.identitySigningKey.privateKey.slice(),
    }),
    signedPreKey: Object.freeze({
      keyId: credentials.signedPreKey.keyId,
      publicKey: credentials.signedPreKey.publicKey.slice(),
      privateKey: credentials.signedPreKey.privateKey.slice(),
      signature: credentials.signedPreKey.signature.slice(),
      generatedAt: credentials.signedPreKey.generatedAt,
    }),
    registrationId: credentials.registrationId,
    ...(credentials.advSecretKey
      ? { advSecretKey: credentials.advSecretKey.slice() }
      : {}),
    ...(credentials.noiseStatic
      ? {
          noiseStatic: Object.freeze({
            publicKey: credentials.noiseStatic.publicKey.slice(),
            privateKey: credentials.noiseStatic.privateKey.slice(),
          }),
        }
      : {}),
  });
}
