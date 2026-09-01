import type { ProtocolNode } from "../../../node/index.js";
import { WhatsAppMessageEncryptor, WhatsAppMessageEnvelopeBuilder, type SignalMessageEncryptor } from "../../../../signal/message/index.js";
import { OutboundMessageError } from "./outbound-message-errors.js";
import type { OutboundMessageInput, OutboundMessageSendResult, OutboundRecipientDevice } from "./outbound-message-types.js";
export type OutboundMessageSerializer = { readonly serialize:(input:OutboundMessageInput)=>Uint8Array };
export type RecipientDeviceResolver = { readonly resolve:(remoteJid:string)=>Promise<readonly OutboundRecipientDevice[]> };
export type OutboundNodeBuilder = { readonly build:(input:OutboundMessageInput, encrypted:readonly ProtocolNode[])=>ProtocolNode };
export type OutboundNodeSender = { readonly sendNode:(node:ProtocolNode)=>Promise<void> };
export type OutboundMessageSenderDependencies = { readonly serializer:OutboundMessageSerializer; readonly devices:RecipientDeviceResolver; readonly signal:SignalMessageEncryptor; readonly nodeBuilder:OutboundNodeBuilder; readonly transport:OutboundNodeSender };
export class OutboundMessageSender {
  private readonly encryptor:WhatsAppMessageEncryptor;
  constructor(private readonly deps:OutboundMessageSenderDependencies){ this.encryptor=new WhatsAppMessageEncryptor(deps.signal,new WhatsAppMessageEnvelopeBuilder()); }
  async send(input:OutboundMessageInput):Promise<OutboundMessageSendResult>{
    validate(input);
    let plaintext:Uint8Array;
    try{ plaintext=this.deps.serializer.serialize(input); }catch(error){throw new OutboundMessageError("OUTBOUND_MESSAGE_SERIALIZATION_FAILED","Failed to serialize outbound message.",{cause:error});}
    let devices:readonly OutboundRecipientDevice[];
    try{ devices=await this.deps.devices.resolve(input.remoteJid); }catch(error){throw new OutboundMessageError("OUTBOUND_MESSAGE_DEVICE_RESOLUTION_FAILED",`Failed to resolve devices for ${input.remoteJid}.`,{cause:error});}
    if(devices.length===0) throw new OutboundMessageError("OUTBOUND_MESSAGE_DEVICE_RESOLUTION_FAILED",`No target devices resolved for ${input.remoteJid}.`);
    const encryptedNodes:ProtocolNode[]=[];
    for(const device of devices){
      const target=withDevice(device.jid,device.device);
      try{ encryptedNodes.push(await this.encryptor.buildEnvelope(target,plaintext)); }
      catch(error){throw new OutboundMessageError("OUTBOUND_MESSAGE_ENCRYPT_FAILED",`Failed to encrypt outbound message for ${target}.`,{cause:error});}
    }
    let node:ProtocolNode;
    try{ node=this.deps.nodeBuilder.build(input,Object.freeze(encryptedNodes)); }catch(error){throw new OutboundMessageError("OUTBOUND_MESSAGE_BUILD_FAILED","Failed to build outbound message node.",{cause:error});}
    try{ await this.deps.transport.sendNode(node); }catch(error){throw new OutboundMessageError("OUTBOUND_MESSAGE_SEND_FAILED",`Failed to send outbound message ${input.id}.`,{cause:error});}
    return Object.freeze({status:"sent",id:input.id,remoteJid:input.remoteJid,deviceCount:devices.length,node});
  }
}
function validate(input:OutboundMessageInput):void{ if(!input.id) throw new OutboundMessageError("OUTBOUND_MESSAGE_INVALID","Message id is required."); if(!input.remoteJid||!input.remoteJid.includes("@")) throw new OutboundMessageError("OUTBOUND_MESSAGE_INVALID","Remote JID is invalid."); if(!(input.plaintext instanceof Uint8Array)||input.plaintext.length===0) throw new OutboundMessageError("OUTBOUND_MESSAGE_INVALID","Plaintext must be non-empty bytes."); }
function withDevice(jid:string,device?:number):string{ if(device===undefined)return jid; const at=jid.indexOf("@"); if(at<=0||!Number.isInteger(device)||device<0||device>255) throw new OutboundMessageError("OUTBOUND_MESSAGE_INVALID","Invalid recipient device."); return `${jid.slice(0,at)}:${device}@${jid.slice(at+1)}`; }
