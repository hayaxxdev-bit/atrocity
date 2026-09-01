import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { SignalSessionBinaryCodec } from "./binary-codec.js";
import { SessionPersistenceError } from "./session-persistence-errors.js";
import type { SignalSessionRecord } from "./session-record.js";
import type { SignalSessionStore } from "./session-store.js";

export class FileSignalSessionStore implements SignalSessionStore {
  private readonly codec = new SignalSessionBinaryCodec();

  constructor(private readonly directory: string) {}

  async load(sessionId: string): Promise<SignalSessionRecord | undefined> {
    const path = this.pathFor(sessionId);
    try {
      const bytes = await fs.readFile(path);
      return this.codec.decode(new Uint8Array(bytes));
    } catch (error) {
      const code = error as NodeJS.ErrnoException;
      if (code?.code === "ENOENT") return undefined;
      if (error instanceof SessionPersistenceError) throw error;
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_IO",
        `Failed to load session ${sessionId}.`,
        { cause: error },
      );
    }
  }

  async save(record: SignalSessionRecord): Promise<void> {
    const bytes = this.codec.encode(record);
    const path = this.pathFor(record.sessionId);
    const temp = `${path}.${process.pid}.${Date.now()}.tmp`;

    try {
      await fs.mkdir(this.directory, { recursive: true });
      await fs.writeFile(temp, bytes, { mode: 0o600 });
      await fs.rename(temp, path);
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => undefined);
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_IO",
        `Failed to atomically save session ${record.sessionId}.`,
        { cause: error },
      );
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await fs.rm(this.pathFor(sessionId), { force: true });
    } catch (error) {
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_IO",
        `Failed to delete session ${sessionId}.`,
        { cause: error },
      );
    }
  }

  async list(): Promise<readonly string[]> {
    try {
      const entries = await fs.readdir(this.directory);
      return Object.freeze(
        entries
          .filter((entry) => entry.endsWith(".session"))
          .map((entry) => entry.slice(0, -".session".length)),
      );
    } catch (error) {
      const code = error as NodeJS.ErrnoException;
      if (code?.code === "ENOENT") return Object.freeze([]);
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_IO",
        "Failed to list persisted sessions.",
        { cause: error },
      );
    }
  }

  private pathFor(sessionId: string): string {
    if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_INVALID",
        "Session id contains unsafe filesystem characters.",
      );
    }
    return join(this.directory, `${sessionId}.session`);
  }
}
