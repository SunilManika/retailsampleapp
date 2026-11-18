import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface AddPartitionsToTxnRequestTopic {
    name: string;
    partitions: number[];
}
export interface AddPartitionsToTxnRequestTransaction {
    transactionalId: string;
    producerId: bigint;
    producerEpoch: number;
    verifyOnly: boolean;
    topics: AddPartitionsToTxnRequestTopic[];
}
export type AddPartitionsToTxnRequest = Parameters<typeof createRequest>;
export interface AddPartitionsToTxnResponsePartition {
    partitionIndex: number;
    partitionErrorCode: number;
}
export interface AddPartitionsToTxnResponseTopic {
    name: string;
    resultsByPartition: AddPartitionsToTxnResponsePartition[];
}
export interface AddPartitionsToTxnResponseTransaction {
    transactionalId: string;
    topicResults: AddPartitionsToTxnResponseTopic[];
}
export interface AddPartitionsToTxnResponse {
    throttleTimeMs: number;
    errorCode: number;
    resultsByTransaction: AddPartitionsToTxnResponseTransaction[];
}
export declare function createRequest(transactions: AddPartitionsToTxnRequestTransaction[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): AddPartitionsToTxnResponse;
export declare const api: import("../definitions.ts").API<[transactions: AddPartitionsToTxnRequestTransaction[]], AddPartitionsToTxnResponse>;
