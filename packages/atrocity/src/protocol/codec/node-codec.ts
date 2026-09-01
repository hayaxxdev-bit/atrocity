import { ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import type { ProtocolNode } from "../node/protocol-node.js";
import type { ProtocolContent } from "../node/protocol-content.js";
import { ProtocolCodecError } from "./codec-errors.js";

export type NodeCodecStrategy = {
  encodeTag(tag: string, writer: ByteWriter): void;
  decodeTag(reader: ByteReader): string;

  encodeAttributes(
    attrs: Readonly<Record<string, string>>,
    writer: ByteWriter,
  ): void;

  decodeAttributes(
    reader: ByteReader,
  ): Readonly<Record<string, string>>;

  encodeContent(
    content: ProtocolContent | undefined,
    writer: ByteWriter,
    depth: number,
  ): void;

  decodeContent(
    reader: ByteReader,
    depth: number,
  ): ProtocolContent | undefined;
};

export type NodeCodecLimits = {
  readonly maxDepth: number;
  readonly maxAttributes: number;
  readonly maxStringBytes: number;
  readonly maxBinaryBytes: number;
  readonly maxChildren: number;
};

export const DEFAULT_NODE_CODEC_LIMITS: NodeCodecLimits = Object.freeze({
  maxDepth: 64,
  maxAttributes: 256,
  maxStringBytes: 1 << 20,
  maxBinaryBytes: 16 << 20,
  maxChildren: 4096,
});

/**
 * Generic node codec orchestration.
 *
 * The strategy owns the actual wire-format decisions. This layer only
 * walks the logical ProtocolNode tree and applies safety limits.
 */
export class NodeCodec {
  constructor(
    private readonly strategy: NodeCodecStrategy,
    private readonly limits: NodeCodecLimits = DEFAULT_NODE_CODEC_LIMITS,
  ) {
    validateLimits(limits);
  }

  encode(node: ProtocolNode): Uint8Array {
    const writer = new ByteWriter();
    this.encodeNode(node, writer, 0);
    return writer.toUint8Array();
  }

  decode(bytes: Uint8Array): ProtocolNode {
    const reader = new ByteReader(bytes);
    const node = this.decodeNode(reader, 0);

    if (!reader.eof) {
      throw new ProtocolCodecError(
        `Trailing bytes after protocol node at offset ${reader.offset}.`,
        { offset: reader.offset },
      );
    }

    return node;
  }

  private encodeNode(
    node: ProtocolNode,
    writer: ByteWriter,
    depth: number,
  ): void {
    if (depth > this.limits.maxDepth) {
      throw new ProtocolCodecError(
        `Protocol node depth exceeds limit ${this.limits.maxDepth}.`,
      );
    }

    this.strategy.encodeTag(node.tag, writer);

    const attributeEntries = Object.entries(node.attrs);
    if (attributeEntries.length > this.limits.maxAttributes) {
      throw new ProtocolCodecError(
        `Protocol node has ${attributeEntries.length} attributes; limit is ${this.limits.maxAttributes}.`,
      );
    }

    this.strategy.encodeAttributes(node.attrs, writer);

    validateContentLimits(node.content, this.limits, depth);
    this.strategy.encodeContent(node.content, writer, depth);
  }

  private decodeNode(
    reader: ByteReader,
    depth: number,
  ): ProtocolNode {
    if (depth > this.limits.maxDepth) {
      throw new ProtocolCodecError(
        `Protocol node depth exceeds limit ${this.limits.maxDepth}.`,
        { offset: reader.offset },
      );
    }

    try {
      const tag = this.strategy.decodeTag(reader);
      const attrs = this.strategy.decodeAttributes(reader);

      if (Object.keys(attrs).length > this.limits.maxAttributes) {
        throw new ProtocolCodecError(
          `Decoded protocol node exceeds attribute limit ${this.limits.maxAttributes}.`,
          { offset: reader.offset },
        );
      }

      const content = this.strategy.decodeContent(reader, depth);

      return {
        tag,
        attrs: Object.freeze({ ...attrs }),
        ...(content === undefined ? {} : { content }),
      };
    } catch (error) {
      if (error instanceof ProtocolCodecError) {
        throw error;
      }

      throw new ProtocolCodecError(
        `Failed to decode protocol node at offset ${reader.offset}.`,
        { offset: reader.offset, cause: error },
      );
    }
  }
}

function validateLimits(limits: NodeCodecLimits): void {
  const values = Object.values(limits);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError("Node codec limits must be non-negative safe integers.");
  }
}

function validateContentLimits(
  content: ProtocolContent | undefined,
  limits: NodeCodecLimits,
  depth: number,
): void {
  if (content === undefined) {
    return;
  }

  switch (content.kind) {
    case "binary":
      if (content.value.byteLength > limits.maxBinaryBytes) {
        throw new ProtocolCodecError(
          `Binary content exceeds limit ${limits.maxBinaryBytes} bytes.`,
        );
      }
      break;

    case "text":
      if (new TextEncoder().encode(content.value).byteLength > limits.maxStringBytes) {
        throw new ProtocolCodecError(
          `Text content exceeds limit ${limits.maxStringBytes} bytes.`,
        );
      }
      break;

    case "nodes":
      if (content.value.length > limits.maxChildren) {
        throw new ProtocolCodecError(
          `Child node count exceeds limit ${limits.maxChildren}.`,
        );
      }

      if (depth + 1 > limits.maxDepth) {
        throw new ProtocolCodecError(
          `Protocol node depth exceeds limit ${limits.maxDepth}.`,
        );
      }

      for (const child of content.value) {
        validateContentLimits(child.content, limits, depth + 1);
      }
      break;
  }
}
