import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type AddOffsetsToTxnRequest = Parameters<typeof createRequest>;
export interface AddOffsetsToTxnResponse {
    throttleTimeMs: number;
    errorCode: number;
}
export declare function createRequest(transactionalId: string, producerId: bigint, producerEpoch: number, groupId: string): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): AddOffsetsToTxnResponse;
export declare const api: import("../definitions.ts").API<[transactionalId: string, producerId: bigint, producerEpoch: number, groupId: string], AddOffsetsToTxnResponse>;
