    import type { ProtocolContent } from "../node/protocol-content.js";
    import type { ProtocolNode } from "../node/protocol-node.js";
    import { ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
    import type { NodeCodecStrategy } from "./node-codec.js";

    /**
     * Development-only strategy used to test codec orchestration.
     *
     * It is deliberately NOT a WhatsApp/WABinary format implementation.
     */
    export const unsupportedWireStrategy: NodeCodecStrategy = {
      encodeTag(_tag: string, _writer: ByteWriter): never {
        throw new Error("Wire-format strategy is not implemented yet.");
      },
      decodeTag(_reader: ByteReader): never {
        throw new Error("Wire-format strategy is not implemented yet.");
      },
      encodeAttributes(
        _attrs: Readonly<Record<string, string>>,
        _writer: ByteWriter,
      ): never {
        throw new Error("Wire-format strategy is not implemented yet.");
      },
      decodeAttributes(
        _reader: ByteReader,
      ): never {
        throw new Error("Wire-format strategy is not implemented yet.");
      },
      encodeContent(
        _content: ProtocolContent | undefined,
        _writer: ByteWriter,
        _depth: number,
      ): never {
        throw new Error("Wire-format strategy is not implemented yet.");
      },
      decodeContent(
        _reader: ByteReader,
        _depth: number,
      ): never {
        throw new Error("Wire-format strategy is not implemented yet.");
      },
    };
});
