import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { type CreateRecordsBatchOptions, type MessageRecord } from '../../protocol/records.ts';
import { Writer } from '../../protocol/writer.ts';
export type ProduceRequest = Parameters<typeof createRequest>;
export interface ProduceResponsePartitionRecordError {
    batchIndex: number;
    batchIndexErrorMessage: NullableString;
}
export interface ProduceResponsePartition {
    index: number;
    errorCode: number;
    baseOffset: bigint;
    logAppendTimeMs: bigint;
    logStartOffset: bigint;
    recordErrors: ProduceResponsePartitionRecordError[];
    errorMessage: NullableString;
}
export interface ProduceResponseTopic {
    name: string;
    partitionResponses: ProduceResponsePartition[];
}
export interface ProduceResponse {
    responses: ProduceResponseTopic[];
    throttleTimeMs: number;
}
export declare function createRequest(acks: number | undefined, timeout: number | undefined, topicData: MessageRecord[], options?: Partial<CreateRecordsBatchOptions>): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): ProduceResponse;
export declare const api: import("../definitions.ts").API<[acks: number | undefined, timeout: number | undefined, topicData: MessageRecord[], options?: Partial<CreateRecordsBatchOptions> | undefined], boolean | ProduceResponse>;
