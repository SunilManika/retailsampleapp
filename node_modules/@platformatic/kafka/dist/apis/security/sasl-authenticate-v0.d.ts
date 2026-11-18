import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
import { type API } from '../definitions.ts';
export type SaslAuthenticateRequest = Parameters<typeof createRequest>;
export interface SaslAuthenticateResponse {
    errorCode: number;
    errorMessage: NullableString;
    authBytes: Buffer;
    sessionLifetimeMs: bigint;
}
export type SASLAuthenticationAPI = API<[Buffer], SaslAuthenticateResponse>;
export declare function createRequest(authBytes: Buffer): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): SaslAuthenticateResponse;
export declare const api: API<[authBytes: Buffer<ArrayBufferLike>], SaslAuthenticateResponse>;
