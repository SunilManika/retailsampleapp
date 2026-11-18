import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type DescribeTransactionsRequest = Parameters<typeof createRequest>;
export interface DescribeTransactionsResponseTopic {
    topic: string;
    partitions: number[];
}
export interface DescribeTransactionsResponseTransactionState {
    errorCode: number;
    transactionalId: string;
    transactionState: string;
    transactionTimeoutMs: number;
    transactionStartTimeMs: bigint;
    producerId: bigint;
    producerEpoch: number;
    topics: DescribeTransactionsResponseTopic[];
}
export interface DescribeTransactionsResponse {
    throttleTimeMs: number;
    transactionStates: DescribeTransactionsResponseTransactionState[];
}
export declare function createRequest(transactionalIds: string[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): DescribeTransactionsResponse;
export declare const api: import("../definitions.ts").API<[transactionalIds: string[]], DescribeTransactionsResponse>;
