import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type EnvelopeRequest = Parameters<typeof createRequest>;
export interface EnvelopeResponse {
    responseData: Buffer | null;
    errorCode: number;
}
export declare function createRequest(requestData: Buffer, requestPrincipal: Buffer | undefined | null, clientHostAddress: Buffer): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): EnvelopeResponse;
export declare const api: import("../definitions.ts").API<[requestData: Buffer<ArrayBufferLike>, requestPrincipal: Buffer<ArrayBufferLike> | null | undefined, clientHostAddress: Buffer<ArrayBufferLike>], EnvelopeResponse>;
