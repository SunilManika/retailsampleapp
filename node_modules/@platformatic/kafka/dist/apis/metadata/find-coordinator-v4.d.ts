import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export type FindCoordinatorRequest = Parameters<typeof createRequest>;
export interface FindCoordinatorResponseCoordinator {
    key: string;
    nodeId: number;
    host: string;
    port: number;
    errorCode: number;
    errorMessage: NullableString;
}
export interface FindCoordinatorResponse {
    throttleTimeMs: number;
    coordinators: FindCoordinatorResponseCoordinator[];
}
export declare function createRequest(keyType: number, coordinatorKeys: string[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): FindCoordinatorResponse;
export declare const api: import("../definitions.ts").API<[keyType: number, coordinatorKeys: string[]], FindCoordinatorResponse>;
