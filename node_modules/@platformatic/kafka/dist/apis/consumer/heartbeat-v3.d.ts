import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type HeartbeatRequest = Parameters<typeof createRequest>;
export interface HeartbeatResponse {
    throttleTimeMs: number;
    errorCode: number;
}
export declare function createRequest(groupId: string, generationId: number, memberId: string, groupInstanceId?: NullableString): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): HeartbeatResponse;
export declare const api: import("../definitions.ts").API<[groupId: string, generationId: number, memberId: string, groupInstanceId?: NullableString], HeartbeatResponse>;
