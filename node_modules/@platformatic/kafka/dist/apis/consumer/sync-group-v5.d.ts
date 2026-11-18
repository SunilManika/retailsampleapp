import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface SyncGroupRequestAssignment {
    memberId: string;
    assignment: Buffer;
}
export type SyncGroupRequest = Parameters<typeof createRequest>;
export interface SyncGroupResponse {
    throttleTimeMs: number;
    errorCode: number;
    protocolType: NullableString;
    protocolName: NullableString;
    assignment: Buffer;
}
export declare function createRequest(groupId: string, generationId: number, memberId: string, groupInstanceId: NullableString, protocolType: NullableString, protocolName: NullableString, assignments: SyncGroupRequestAssignment[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): SyncGroupResponse;
export declare const api: import("../definitions.ts").API<[groupId: string, generationId: number, memberId: string, groupInstanceId: NullableString, protocolType: NullableString, protocolName: NullableString, assignments: SyncGroupRequestAssignment[]], SyncGroupResponse>;
