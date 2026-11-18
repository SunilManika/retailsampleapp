import { type NullableString } from '../../protocol/definitions.ts';
import { type Reader } from '../../protocol/reader.ts';
import { Writer } from '../../protocol/writer.ts';
export interface DescribeQuorumRequestPartition {
    partitionIndex: number;
}
export interface DescribeQuorumRequestTopic {
    topicName: string;
    partitions: DescribeQuorumRequestPartition[];
}
export type DescribeQuorumRequest = Parameters<typeof createRequest>;
export interface DescribeQuorumResponseVoter {
    replicaId: number;
    replicaDirectoryId: string;
    logEndOffset: bigint;
    lastFetchTimestamp: bigint;
    lastCaughtUpTimestamp: bigint;
}
export interface DescribeQuorumResponsePartition {
    partitionIndex: number;
    errorCode: number;
    errorMessage: NullableString;
    leaderId: number;
    leaderEpoch: number;
    highWatermark: bigint;
    currentVoters: DescribeQuorumResponseVoter[];
    observers: DescribeQuorumResponseVoter[];
}
export interface DescribeQuorumResponseNodeListener {
    name: string;
    host: string;
    port: number;
}
export interface DescribeQuorumResponseTopic {
    topicName: string;
    partitions: DescribeQuorumResponsePartition[];
}
export interface DescribeQuorumResponseNode {
    nodeId: number;
    listeners: DescribeQuorumResponseNodeListener[];
}
export interface DescribeQuorumResponse {
    errorCode: number;
    errorMessage: NullableString;
    topics: DescribeQuorumResponseTopic[];
    nodes: DescribeQuorumResponseNode[];
}
export declare function createRequest(topics: DescribeQuorumRequestTopic[]): Writer;
export declare function parseResponse(_correlationId: number, apiKey: number, apiVersion: number, reader: Reader): DescribeQuorumResponse;
export declare const api: import("../definitions.ts").API<[topics: DescribeQuorumRequestTopic[]], DescribeQuorumResponse>;
