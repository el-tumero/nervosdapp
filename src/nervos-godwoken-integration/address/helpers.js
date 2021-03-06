Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeployConfig = exports.SerializeDepositionLockArgs = exports.SerializeScript = exports.SerializeUint64 = exports.SerializeBytes = exports.SerializeByte32 = exports.serializeTable = exports.serializeArgs = exports.generateDepositionLock = exports.getRollupTypeHash = void 0;
const ckb_js_toolkit_1 = require("ckb-js-toolkit");
const base_1 = require("@ckb-lumos/base");
function getRollupTypeHash(rollup_type_script) {
    const hash = base_1.utils.computeScriptHash(rollup_type_script);
    return hash;
}
exports.getRollupTypeHash = getRollupTypeHash;
function generateDepositionLock(config, args) {
    return {
        code_hash: config.deposition_lock.code_hash,
        hash_type: config.deposition_lock.hash_type,
        args: args,
    };
}
exports.generateDepositionLock = generateDepositionLock;
function serializeArgs(args, rollup_type_script) {
    const rollup_type_hash = getRollupTypeHash(rollup_type_script);
    const serializedDepositionLockArgs = SerializeDepositionLockArgs(NormalizeDepositionLockArgs(args));
    const depositionLockArgsStr = new ckb_js_toolkit_1.Reader(serializedDepositionLockArgs).serializeJson();
    return rollup_type_hash + depositionLockArgsStr.slice(2);
}
exports.serializeArgs = serializeArgs;
function normalizeHexNumber(length) {
    return function (debugPath, value) {
        if (!(value instanceof ArrayBuffer)) {
            let intValue = value.toString(16);
            if (intValue.length % 2 !== 0) {
                intValue = "0" + intValue;
            }
            if (intValue.length / 2 > length) {
                throw new Error(`${debugPath} is ${intValue.length / 2} bytes long, expected length is ${length}!`);
            }
            const view = new DataView(new ArrayBuffer(length));
            for (let i = 0; i < intValue.length / 2; i++) {
                const start = intValue.length - (i + 1) * 2;
                view.setUint8(i, parseInt(intValue.substr(start, 2), 16));
            }
            value = view.buffer;
        }
        if (value.byteLength < length) {
            const array = new Uint8Array(length);
            array.set(new Uint8Array(value), 0);
            value = array.buffer;
        }
        return value;
    };
}
function normalizeObject(debugPath, obj, keys) {
    const result = {};
    for (const [key, f] of Object.entries(keys)) {
        const value = obj[key];
        if (!value) {
            throw new Error(`${debugPath} is missing ${key}!`);
        }
        result[key] = f(`${debugPath}.${key}`, value);
    }
    return result;
}
function normalizeRawData(length) {
    return function (debugPath, value) {
        value = new ckb_js_toolkit_1.Reader(value).toArrayBuffer();
        if (length > 0 && value.byteLength !== length) {
            throw new Error(`${debugPath} has invalid length ${value.byteLength}, required: ${length}`);
        }
        return value;
    };
}
function toNormalize(normalize) {
    return function (debugPath, value) {
        return normalize(value, {
            debugPath,
        });
    };
}
function NormalizeDepositionLockArgs(args, { debugPath = "deposition_lock_args" } = {}) {
    return normalizeObject(debugPath, args, {
        owner_lock_hash: normalizeRawData(32),
        layer2_lock: toNormalize(ckb_js_toolkit_1.normalizers.NormalizeScript),
        cancel_timeout: normalizeHexNumber(8),
    });
}
function dataLengthError(actual, required) {
    throw new Error(`Invalid data length! Required: ${required}, actual: ${actual}`);
}
function assertArrayBuffer(reader) {
    if (reader instanceof Object && reader.toArrayBuffer instanceof Function) {
        reader = reader.toArrayBuffer();
    }
    if (!(reader instanceof ArrayBuffer)) {
        throw new Error("Provided value must be an ArrayBuffer or can be transformed into ArrayBuffer!");
    }
    return reader;
}
function assertDataLength(actual, required) {
    if (actual !== required) {
        dataLengthError(actual, required);
    }
}
function serializeTable(buffers) {
    const itemCount = buffers.length;
    let totalSize = 4 * (itemCount + 1);
    const offsets = [];
    for (let i = 0; i < itemCount; i++) {
        offsets.push(totalSize);
        totalSize += buffers[i].byteLength;
    }
    const buffer = new ArrayBuffer(totalSize);
    const array = new Uint8Array(buffer);
    const view = new DataView(buffer);
    view.setUint32(0, totalSize, true);
    for (let i = 0; i < itemCount; i++) {
        view.setUint32(4 + i * 4, offsets[i], true);
        array.set(new Uint8Array(buffers[i]), offsets[i]);
    }
    return buffer;
}
exports.serializeTable = serializeTable;
function SerializeByte32(value) {
    const buffer = assertArrayBuffer(value);
    assertDataLength(buffer.byteLength, 32);
    return buffer;
}
exports.SerializeByte32 = SerializeByte32;
function SerializeBytes(value) {
    const item = assertArrayBuffer(value);
    const array = new Uint8Array(4 + item.byteLength);
    new DataView(array.buffer).setUint32(0, item.byteLength, true);
    array.set(new Uint8Array(item), 4);
    return array.buffer;
}
exports.SerializeBytes = SerializeBytes;
function SerializeUint64(value) {
    const buffer = assertArrayBuffer(value);
    assertDataLength(buffer.byteLength, 8);
    return buffer;
}
exports.SerializeUint64 = SerializeUint64;
function SerializeScript(value) {
    const buffers = [];
    buffers.push(SerializeByte32(value.code_hash));
    const hashTypeView = new DataView(new ArrayBuffer(1));
    hashTypeView.setUint8(0, value.hash_type);
    buffers.push(hashTypeView.buffer);
    buffers.push(SerializeBytes(value.args));
    return serializeTable(buffers);
}
exports.SerializeScript = SerializeScript;
function SerializeDepositionLockArgs(value) {
    const buffers = [];
    buffers.push(SerializeByte32(value.owner_lock_hash));
    buffers.push(SerializeScript(value.layer2_lock));
    buffers.push(SerializeUint64(value.cancel_timeout));
    return serializeTable(buffers);
}
exports.SerializeDepositionLockArgs = SerializeDepositionLockArgs;
function buildScriptFromCodeHash(codeHash) {
    return {
        code_hash: codeHash,
        hash_type: "type",
        args: "0x",
    };
}
const generateDeployConfig = (depositLockHash, ethAccountLockHash) => {
    return {
        deposition_lock: buildScriptFromCodeHash(depositLockHash),
        eth_account_lock: buildScriptFromCodeHash(ethAccountLockHash),
    };
};
exports.generateDeployConfig = generateDeployConfig;
