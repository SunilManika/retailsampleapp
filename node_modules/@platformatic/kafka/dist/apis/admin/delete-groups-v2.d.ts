import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type DeleteGroupsRequest = Parameters<typeof createRequest>;
export interface DeleteGroupsResponseGroup {
    groupId: string;
    errorCode: number;
}
export interface DeleteGroupsResponse {
    throttleTimeMs: number;
    results: DeleteGroupsResponseGroup[];
}
export declare function createRequest(groupsNames: string[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): DeleteGroupsResponse;
export declare const api: import("../definitions.ts").API<[groupsNames: string[]], DeleteGroupsResponse>;
