import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface OffsetDeleteRequestPartition {
    partitionIndex: number;
}
export interface OffsetDeleteRequestTopic {
    name: string;
    partitions: OffsetDeleteRequestPartition[];
}
export type OffsetDeleteRequest = Parameters<typeof createRequest>;
export interface OffsetDeleteResponsePartition {
    partitionIndex: number;
    errorCode: number;
}
export interface OffsetDeleteResponseTopic {
    name: string;
    partitions: OffsetDeleteResponsePartition[];
}
export interface OffsetDeleteResponse {
    errorCode: number;
    throttleTimeMs: number;
    topics: OffsetDeleteResponseTopic[];
}
export declare function createRequest(groupId: string, topics: OffsetDeleteRequestTopic[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): OffsetDeleteResponse;
export declare const api: import("../definitions.ts").API<[groupId: string, topics: OffsetDeleteRequestTopic[]], OffsetDeleteResponse>;
