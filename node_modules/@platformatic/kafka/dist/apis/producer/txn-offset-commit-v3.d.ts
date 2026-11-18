import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface TxnOffsetCommitRequestPartition {
    partitionIndex: number;
    committedOffset: bigint;
    committedLeaderEpoch: number;
    committedMetadata?: NullableString;
}
export interface TxnOffsetCommitRequestTopic {
    name: string;
    partitions: TxnOffsetCommitRequestPartition[];
}
export type TxnOffsetCommitRequest = Parameters<typeof createRequest>;
export interface TxnOffsetCommitResponsePartition {
    partitionIndex: number;
    errorCode: number;
}
export interface TxnOffsetCommitResponseTopic {
    name: string;
    partitions: TxnOffsetCommitResponsePartition[];
}
export interface TxnOffsetCommitResponse {
    throttleTimeMs: number;
    topics: TxnOffsetCommitResponseTopic[];
}
export declare function createRequest(transactionalId: string, groupId: string, producerId: bigint, producerEpoch: number, generationId: number, memberId: string, groupInstanceId: NullableString, topics: TxnOffsetCommitRequestTopic[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): TxnOffsetCommitResponse;
export declare const api: import("../definitions.ts").API<[transactionalId: string, groupId: string, producerId: bigint, producerEpoch: number, generationId: number, memberId: string, groupInstanceId: NullableString, topics: TxnOffsetCommitRequestTopic[]], TxnOffsetCommitResponse>;
