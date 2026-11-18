import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface CreateDelegationTokenRequestRenewer {
    principalType: string;
    principalName: string;
}
export type CreateDelegationTokenRequest = Parameters<typeof createRequest>;
export interface CreateDelegationTokenResponse {
    errorCode: number;
    principalType: string;
    principalName: string;
    tokenRequesterPrincipalType: string;
    tokenRequesterPrincipalName: string;
    issueTimestampMs: bigint;
    expiryTimestampMs: bigint;
    maxTimestampMs: bigint;
    tokenId: string;
    hmac: Buffer;
    throttleTimeMs: number;
}
export declare function createRequest(ownerPrincipalType: NullableString, ownerPrincipalName: NullableString, renewers: CreateDelegationTokenRequestRenewer[], maxLifetimeMs: bigint): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): CreateDelegationTokenResponse;
export declare const api: import("../definitions.ts").API<[ownerPrincipalType: NullableString, ownerPrincipalName: NullableString, renewers: CreateDelegationTokenRequestRenewer[], maxLifetimeMs: bigint], CreateDelegationTokenResponse>;
