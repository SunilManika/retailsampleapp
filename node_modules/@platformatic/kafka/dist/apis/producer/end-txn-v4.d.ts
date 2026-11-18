import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type EndTxnRequest = Parameters<typeof createRequest>;
export interface EndTxnResponse {
    throttleTimeMs: number;
    errorCode: number;
}
export declare function createRequest(transactionalId: string, producerId: bigint, producerEpoch: number, committed: boolean): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): EndTxnResponse;
export declare const api: import("../definitions.ts").API<[transactionalId: string, producerId: bigint, producerEpoch: number, committed: boolean], EndTxnResponse>;
