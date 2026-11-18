import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type RenewDelegationTokenRequest = Parameters<typeof createRequest>;
export interface RenewDelegationTokenResponse {
    errorCode: number;
    expiryTimestampMs: bigint;
    throttleTimeMs: number;
}
export declare function createRequest(hmac: Buffer, renewPeriodMs: bigint): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): RenewDelegationTokenResponse;
export declare const api: import("../definitions.ts").API<[hmac: Buffer<ArrayBufferLike>, renewPeriodMs: bigint], RenewDelegationTokenResponse>;
