import { type Gauge } from '../metrics.ts';
export declare class TopicsMap extends Map<string, number> {
    #private;
    get current(): string[];
    clear(): void;
    track(topic: string): boolean;
    trackAll(...topics: string[]): boolean[];
    untrack(topic: string): boolean;
    untrackAll(...topics: string[]): boolean[];
    setMetric(metric: Gauge): void;
}
