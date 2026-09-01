import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppPreKeySerializer, WhatsAppPreKeyUploadBuilder } from "../src/signal/index.js";

function bundle() {
  const b=(n:number,v:number)=>new Uint8Array(n).fill(v);
  return {
    identityKey:{publicKey:b(32,1),privateKey:b(32,2)},
    registrationId:123,
    signedPreKey:{id:0x010203,publicKey:b(32,3),privateKey:b(32,4),signature:b(64,5),generatedAt:10},
    preKeys:[{id:0x040506,publicKey:b(32,6),privateKey:b(32,7)}]
  };
}
const nodeBytes=(n:any)=>n.content.kind==="binary"?[...n.content.value]:[];
test("signed pre-key uses three-byte big-endian id",()=>{const n=new WhatsAppPreKeySerializer().serializeSignedPreKey(bundle().signedPreKey);const c=n.content?.kind==="nodes"?n.content.value:[];assert.deepEqual(nodeBytes(c[0]),[1,2,3]);assert.equal(c[1].tag,"value");assert.equal(c[2].tag,"signature");});
test("pre-key uses three-byte big-endian id",()=>{const n=new WhatsAppPreKeySerializer().serializePreKey(bundle().preKeys[0]);const c=n.content?.kind==="nodes"?n.content.value:[];assert.deepEqual(nodeBytes(c[0]),[4,5,6]);assert.deepEqual(nodeBytes(c[1]),[...new Uint8Array(32).fill(6)]);});
test("upload builder puts signed pre-key before one-time keys",()=>{const iq=new WhatsAppPreKeyUploadBuilder().build("q1",bundle());assert.equal(iq.attrs.xmlns,"encrypt");const listNode=iq.content?.kind==="nodes"?iq.content.value.find((c)=>c.tag==="list"):undefined;const list=listNode?.content?.kind==="nodes"?listNode.content.value:[];assert.equal(list[0]?.tag,"skey");assert.equal(list[1]?.tag,"key");});
