import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface AlterUserScramCredentialsRequestDeletions {
    name: string;
    mechanism: number;
}
export interface AlterUserScramCredentialsRequestUpsertions {
    name: string;
    mechanism: number;
    iterations: number;
    salt: Buffer;
    saltedPassword: Buffer;
}
export type AlterUserScramCredentialsRequest = Parameters<typeof createRequest>;
export interface AlterUserScramCredentialsResponseResult {
    user: string;
    errorCode: number;
    errorMessage: NullableString;
}
export interface AlterUserScramCredentialsResponse {
    throttleTimeMs: number;
    results: AlterUserScramCredentialsResponseResult[];
}
export declare function createRequest(deletions: AlterUserScramCredentialsRequestDeletions[], upsertions: AlterUserScramCredentialsRequestUpsertions[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): AlterUserScramCredentialsResponse;
export declare const api: import("../definitions.ts").API<[deletions: AlterUserScramCredentialsRequestDeletions[], upsertions: AlterUserScramCredentialsRequestUpsertions[]], AlterUserScramCredentialsResponse>;
