import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type UnregisterBrokerRequest = Parameters<typeof createRequest>;
export interface UnregisterBrokerResponse {
    throttleTimeMs: number;
    errorCode: number;
    errorMessage: NullableString;
}
export declare function createRequest(brokerId: number): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): UnregisterBrokerResponse;
export declare const api: import("../definitions.ts").API<[brokerId: number], UnregisterBrokerResponse>;
