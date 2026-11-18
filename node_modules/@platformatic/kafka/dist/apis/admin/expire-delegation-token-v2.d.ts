import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type ExpireDelegationTokenRequest = Parameters<typeof createRequest>;
export interface ExpireDelegationTokenResponse {
    errorCode: number;
    expiryTimestampMs: bigint;
    throttleTimeMs: number;
}
export declare function createRequest(hmac: Buffer, expiryTimePeriodMs: bigint): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): ExpireDelegationTokenResponse;
export declare const api: import("../definitions.ts").API<[hmac: Buffer<ArrayBufferLike>, expiryTimePeriodMs: bigint], ExpireDelegationTokenResponse>;
