import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface DeleteRecordsRequestPartitions {
    partitionIndex: number;
    offset: bigint;
}
export interface DeleteRecordsRequestTopics {
    name: string;
    partitions: DeleteRecordsRequestPartitions[];
}
export type DeleteRecordsRequest = Parameters<typeof createRequest>;
export interface DeleteRecordsResponsePartition {
    partitionIndex: number;
    lowWatermark: bigint;
    errorCode: number;
}
export interface DeleteRecordsResponseTopic {
    name: string;
    partitions: DeleteRecordsResponsePartition[];
}
export interface DeleteRecordsResponse {
    throttleTimeMs: number;
    topics: DeleteRecordsResponseTopic[];
}
export declare function createRequest(topics: DeleteRecordsRequestTopics[], timeoutMs: number): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): DeleteRecordsResponse;
export declare const api: import("../definitions.ts").API<[topics: DeleteRecordsRequestTopics[], timeoutMs: number], DeleteRecordsResponse>;
