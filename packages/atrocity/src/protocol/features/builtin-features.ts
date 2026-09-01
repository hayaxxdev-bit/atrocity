import type { ProtocolFeature } from "./protocol-feature-types.js";

export const iqFeature = (
  start: () => Promise<void> | void = () => {},
  stop: () => Promise<void> | void = () => {},
): ProtocolFeature =>
  Object.freeze({
    name: "iq",
    version: 1,
    capabilities: ["protocol.iq"],
    requiredServerCapabilities: ["iq"],
    start,
    stop,
  });

export const messageFeature = (
  start: () => Promise<void> | void = () => {},
  stop: () => Promise<void> | void = () => {},
): ProtocolFeature =>
  Object.freeze({
    name: "message",
    version: 1,
    dependencies: ["iq"],
    capabilities: ["protocol.message"],
    requiredServerCapabilities: ["messaging"],
    start,
    stop,
  });

export const presenceFeature = (
  start: () => Promise<void> | void = () => {},
  stop: () => Promise<void> | void = () => {},
): ProtocolFeature =>
  Object.freeze({
    name: "presence",
    version: 1,
    dependencies: ["iq"],
    capabilities: ["protocol.presence"],
    requiredServerCapabilities: ["presence"],
    start,
    stop,
  });

export const receiptFeature = (
  start: () => Promise<void> | void = () => {},
  stop: () => Promise<void> | void = () => {},
): ProtocolFeature =>
  Object.freeze({
    name: "receipt",
    version: 1,
    dependencies: ["message"],
    capabilities: ["protocol.receipt"],
    requiredServerCapabilities: ["receipts"],
    start,
    stop,
  });
