# Atrocity Architecture & Protocol Specification v0.1

Status: Frozen

## Scope

Atrocity is an independent TypeScript WhatsApp client engine. It is not a bot framework, AI framework, downloader, dashboard, or SaaS product.

## Core boundaries

- Public API
- Runtime / lifecycle
- Domain / application APIs
- Synchronization / messaging / groups
- Protocol / serialization
- Security / Signal
- Noise
- Transport
- Persistence / infrastructure

## Compatibility policy

Internal APIs are Atrocity-owned and may be redesigned during pre-1.0 development. Wire-level behavior must match the intended target protocol wherever interoperability requires it.

## Current implementation milestone

M1.1: repository and toolchain foundation.
