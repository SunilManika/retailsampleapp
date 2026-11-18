import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface DescribeProducersRequestTopic {
    name: string;
    partitionIndexes: number[];
}
export type DescribeProducersRequest = Parameters<typeof createRequest>;
export interface DescribeProducersResponsePartitionProducer {
    producerId: bigint;
    producerEpoch: number;
    lastSequence: number;
    lastTimestamp: bigint;
    coordinatorEpoch: number;
    currentTxnStartOffset: bigint;
}
export interface DescribeProducersResponsePartition {
    partitionIndex: number;
    errorCode: number;
    errorMessage: NullableString;
    activeProducers: DescribeProducersResponsePartitionProducer[];
}
export interface DescribeProducersResponseTopic {
    name: string;
    partitions: DescribeProducersResponsePartition[];
}
export interface DescribeProducersResponse {
    throttleTimeMs: number;
    topics: DescribeProducersResponseTopic[];
}
export declare function createRequest(topics: DescribeProducersRequestTopic[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): DescribeProducersResponse;
export declare const api: import("../definitions.ts").API<[topics: DescribeProducersRequestTopic[]], DescribeProducersResponse>;
