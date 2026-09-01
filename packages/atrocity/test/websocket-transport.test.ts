import assert from "node:assert/strict";
import test from "node:test";
import {
  TransportError,
  WebSocketTransport,
  type WebSocketLike,
} from "../src/transport/index.js";

class FakeWebSocket implements WebSocketLike {
  binaryType = "";
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  sent: ArrayBufferView[] = [];

  send(data: ArrayBuffer | ArrayBufferView): void {
    this.sent.push(data instanceof ArrayBuffer ? new Uint8Array(data) : data);
  }

  close(code = 1000, reason = ""): void {
    this.readyState = 3;
    this.onclose?.({
      code,
      reason,
    } as CloseEvent);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  receive(data: Uint8Array): void {
    this.onmessage?.({
      data: data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ),
    } as MessageEvent);
  }

  fail(): void {
    this.onerror?.({} as Event);
  }
}

test("maps websocket lifecycle into transport lifecycle", async () => {
  const fake = new FakeWebSocket();
  const transport = new WebSocketTransport({
    url: "wss://example.invalid",
    createSocket: () => fake,
    connectTimeoutMs: 1000,
  });

  const opening = transport.connect();
  fake.open();

  await opening;
  assert.equal(transport.state, "open");
  assert.equal(fake.binaryType, "arraybuffer");

  await transport.close();
  assert.equal(transport.state, "closed");
});

test("sends opaque Uint8Array without protocol inspection", async () => {
  const fake = new FakeWebSocket();
  const transport = new WebSocketTransport({
    url: "wss://example.invalid",
    createSocket: () => fake,
  });

  const opening = transport.connect();
  fake.open();
  await opening;

  const payload = new Uint8Array([1, 2, 3]);
  await transport.send(payload);

  assert.equal(fake.sent.length, 1);
  assert.deepEqual([...new Uint8Array(fake.sent[0]!.buffer)], [1, 2, 3]);
});

test("normalizes binary websocket messages to Uint8Array", async () => {
  const fake = new FakeWebSocket();
  const received: Uint8Array[] = [];
  const transport = new WebSocketTransport({
    url: "wss://example.invalid",
    createSocket: () => fake,
  });

  transport.setHandlers({
    onData(data) {
      received.push(data);
    },
  });

  const opening = transport.connect();
  fake.open();
  await opening;

  fake.receive(new Uint8Array([9, 8, 7]));

  // Event dispatch is async because the adapter deliberately isolates
  // consumer callback failures from websocket callback execution.
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual([...received[0]!], [9, 8, 7]);
});

test("rejects a second concurrent connect", async () => {
  const fake = new FakeWebSocket();
  const transport = new WebSocketTransport({
    url: "wss://example.invalid",
    createSocket: () => fake,
  });

  const first = transport.connect();

  await assert.rejects(
    transport.connect(),
    (error: unknown) =>
      error instanceof TransportError &&
      error.code === "TRANSPORT_ALREADY_CONNECTING",
  );

  fake.open();
  await first;
});
