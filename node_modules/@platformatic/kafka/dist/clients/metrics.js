// Interfaces to make the package compatible with prom-client
export function ensureMetric(metrics, type, name, help) {
    let metric = metrics.registry.getSingleMetric(name);
    const labels = Object.keys(metrics.labels ?? {});
    if (!metric) {
        metric = new metrics.client[type]({
            name,
            help,
            registers: [metrics.registry],
            labelNames: labels
        });
    }
    else {
        // @ts-expect-error Overriding internal API
        metric.labelNames = metric.sortedLabelNames = Array.from(new Set([...metric.labelNames, ...labels])).sort();
    }
    return metric.labels(metrics.labels ?? {});
}
