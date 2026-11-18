export interface ProtocolErrorDefinition {
    id: string;
    code: number;
    canRetry: boolean;
    message: string;
}
export declare const protocolErrorsCodesById: Record<number, string>;
export declare const protocolErrors: Record<string, ProtocolErrorDefinition>;
