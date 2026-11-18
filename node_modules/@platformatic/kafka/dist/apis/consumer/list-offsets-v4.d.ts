import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface ListOffsetsRequestPartition {
    partitionIndex: number;
    currentLeaderEpoch: number;
    timestamp: bigint;
}
export interface ListOffsetsRequestTopic {
    name: string;
    partitions: ListOffsetsRequestPartition[];
}
export type ListOffsetsRequest = Parameters<typeof createRequest>;
export interface ListOffsetResponsePartition {
    partitionIndex: number;
    errorCode: number;
    timestamp: bigint;
    offset: bigint;
    leaderEpoch: number;
}
export interface ListOffsetResponseTopic {
    name: string;
    partitions: ListOffsetResponsePartition[];
}
export interface ListOffsetsResponse {
    throttleTimeMs: number;
    topics: ListOffsetResponseTopic[];
}
export declare function createRequest(replica: number, isolationLevel: number, topics: ListOffsetsRequestTopic[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): ListOffsetsResponse;
export declare const api: import("../definitions.ts").API<[replica: number, isolationLevel: number, topics: ListOffsetsRequestTopic[]], ListOffsetsResponse>;
