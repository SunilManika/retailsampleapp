import { promisify } from 'node:util';
export function createAPI(apiKey, apiVersion, createRequest, parseResponse, hasRequestHeaderTaggedFields = true, hasResponseHeaderTaggedFields = true) {
    const api = function api(connection, ...args) {
        const cb = typeof args[args.length - 1] === 'function' ? args.pop() : () => { };
        connection.send(apiKey, apiVersion, () => createRequest(...args), parseResponse, hasRequestHeaderTaggedFields, hasResponseHeaderTaggedFields, cb);
    };
    api.async = promisify(api);
    api.key = apiKey;
    api.version = apiVersion;
    return api;
}
