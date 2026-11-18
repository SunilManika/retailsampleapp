import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type DescribeGroupsRequest = Parameters<typeof createRequest>;
export interface DescribeGroupsResponseMember {
    memberId: string;
    groupInstanceId: NullableString;
    clientId: string;
    clientHost: string;
    memberMetadata: Buffer;
    memberAssignment: Buffer;
}
export interface DescribeGroupsResponseGroup {
    errorCode: number;
    groupId: string;
    groupState: string;
    protocolType: string;
    protocolData: string;
    members: DescribeGroupsResponseMember[];
    authorizedOperations: number;
}
export interface DescribeGroupsResponse {
    throttleTimeMs: number;
    groups: DescribeGroupsResponseGroup[];
}
export declare function createRequest(groups: string[], includeAuthorizedOperations: boolean): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): DescribeGroupsResponse;
export declare const api: import("../definitions.ts").API<[groups: string[], includeAuthorizedOperations: boolean], DescribeGroupsResponse>;
