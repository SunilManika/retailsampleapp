export function stringSerializer(data) {
    if (typeof data !== 'string') {
        return undefined;
    }
    return Buffer.from(data, 'utf-8');
}
export function stringDeserializer(data) {
    if (!Buffer.isBuffer(data)) {
        return undefined;
    }
    return data.toString('utf-8');
}
export function jsonSerializer(data) {
    return Buffer.from(JSON.stringify(data), 'utf-8');
}
export function jsonDeserializer(data) {
    if (!Buffer.isBuffer(data)) {
        return undefined;
    }
    return JSON.parse(data.toString('utf-8'));
}
export function serializersFrom(serializer) {
    return {
        key: serializer,
        value: serializer,
        headerKey: serializer,
        headerValue: serializer
    };
}
export function deserializersFrom(deserializer) {
    return {
        key: deserializer,
        value: deserializer,
        headerKey: deserializer,
        headerValue: deserializer
    };
}
export const serdeProperties = {
    type: 'object',
    properties: {
        key: { function: true },
        value: { function: true },
        headerKey: { function: true },
        headerValue: { function: true }
    },
    additionalProperties: false
};
export const stringSerializers = serializersFrom(stringSerializer);
export const stringDeserializers = deserializersFrom(stringDeserializer);
