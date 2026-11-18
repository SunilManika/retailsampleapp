export class TopicsMap extends Map {
    #current = [];
    #metric;
    get current() {
        return this.#current;
    }
    clear() {
        for (const k of this.keys()) {
            this.untrack(k);
        }
        super.clear();
    }
    track(topic) {
        let updated = false;
        let existing = this.get(topic);
        if (typeof existing === 'undefined') {
            existing = 0;
            updated = true;
        }
        this.set(topic, existing + 1);
        if (existing === 0) {
            this.#metric?.inc();
        }
        if (updated) {
            this.#updateCurrentList();
        }
        return updated;
    }
    trackAll(...topics) {
        const updated = [];
        for (const topic of topics.flat()) {
            updated.push(this.track(topic));
        }
        return updated;
    }
    untrack(topic) {
        const existing = this.get(topic);
        if (existing === 1) {
            this.delete(topic);
            this.#updateCurrentList();
            this.#metric?.dec();
            return true;
        }
        else if (typeof existing === 'number') {
            this.set(topic, existing - 1);
        }
        return false;
    }
    untrackAll(...topics) {
        const updated = [];
        for (const topic of topics.flat()) {
            updated.push(this.untrack(topic));
        }
        return updated;
    }
    setMetric(metric) {
        this.#metric = metric;
    }
    #updateCurrentList() {
        this.#current = Array.from(this.keys());
    }
}
