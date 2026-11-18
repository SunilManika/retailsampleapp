import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface OffsetCommitRequestPartition {
    partitionIndex: number;
    committedOffset: bigint;
    committedLeaderEpoch: number;
    committedMetadata?: NullableString;
}
export interface OffsetCommitRequestTopic {
    name: string;
    partitions: OffsetCommitRequestPartition[];
}
export type OffsetCommitRequest = Parameters<typeof createRequest>;
export interface OffsetCommitResponsePartition {
    partitionIndex: number;
    errorCode: number;
}
export interface OffsetCommitResponseTopic {
    name: string;
    partitions: OffsetCommitResponsePartition[];
}
export interface OffsetCommitResponse {
    throttleTimeMs: number;
    topics: OffsetCommitResponseTopic[];
}
export declare function createRequest(groupId: string, generationIdOrMemberEpoch: number, memberId: string, groupInstanceId: NullableString, topics: OffsetCommitRequestTopic[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): OffsetCommitResponse;
export declare const api: import("../definitions.ts").API<[groupId: string, generationIdOrMemberEpoch: number, memberId: string, groupInstanceId: NullableString, topics: OffsetCommitRequestTopic[]], OffsetCommitResponse>;
