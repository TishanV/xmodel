import { createStore } from "solid-js/store";

class Model {}

class ArrayModel extends Model {
  constructor(modelClass) {
    super();
    this.$model_methods = Object.getOwnPropertyNames(
      modelClass.prototype
    ).filter((m) => m !== "constructor");
    this.list = [];
  }
  at(i) {
    return this.list.at(i);
  }
  push(a) {
    this.list.push(a);
  }
  pop(i, n = 1) {
    if (i === undefined) return this.list.pop();
    this.list.splice(i, n);
  }
  [Symbol.iterator]() {
    return this.list.values();
  }
}

class PrimitiveModel extends Model {
  constructor(value) {
    super();
    this.value = value;
  }
  valueOf() {
    return this.value;
  }
}

function useModel(ModelClass, args = []) {
  const modelObject = new ModelClass(...args);
  if (!(modelObject instanceof Model))
    throw "Only models can be passed to useModel. Make sure your model extends Model class";
  const [state, setState] = createStore(capture(modelObject));
  return createModelState(modelObject, state, setState);
}

// HELPERS

const pureObject = (obj) => JSON.parse(JSON.stringify(obj));

const methodNames = (obj, methods = []) => {
  const objProto = Object.getPrototypeOf(obj);
  methods.push(
    ...Object.getOwnPropertyNames(objProto).filter(
      (m) => m !== "constructor" && obj[m] instanceof Function
    )
  );
  if (
    Object.getPrototypeOf(objProto) !== Model.prototype &&
    Object.getPrototypeOf(objProto) !== ArrayModel.prototype &&
    Object.getPrototypeOf(objProto) !== PrimitiveModel.prototype
  )
    methodNames(objProto, methods);
  return Array.from(new Set(methods));
};

const getterNames = (obj, getters = []) => {
  const objProto = Object.getPrototypeOf(obj);
  getters.push(
    ...Object.getOwnPropertyNames(objProto).filter(
      (m) => !(obj[m] instanceof Function)
    )
  );
  if (
    Object.getPrototypeOf(objProto) !== Model.prototype &&
    Object.getPrototypeOf(objProto) !== ArrayModel.prototype &&
    Object.getPrototypeOf(objProto) !== PrimitiveModel.prototype
  )
    getterNames(objProto, getters);
  return Array.from(new Set(getters));
};

const getterFunctions = (obj, getters = {}) => {
  const objProto = Object.getPrototypeOf(obj);
  const getterNames = Object.getOwnPropertyNames(objProto).filter(
    (m) => !(obj[m] instanceof Function)
  );
  for (let getterName of getterNames) {
    if (getterName in getters) continue;
    getters[getterName] = Object.getOwnPropertyDescriptor(
      objProto,
      getterName
    ).get;
  }
  if (
    Object.getPrototypeOf(objProto) !== Model.prototype &&
    Object.getPrototypeOf(objProto) !== ArrayModel.prototype &&
    Object.getPrototypeOf(objProto) !== PrimitiveModel.prototype
  )
    getterFunctions(objProto, getters);
  return getters;
};

const fieldNames = (obj) => [
  ...Object.getOwnPropertyNames(obj),
  ...getterNames(obj),
];

function getNested(obj, keys) {
  if (!keys.length) return obj;
  const key = keys[0];
  return getNested(obj[key], keys.slice(1));
}

const defineGet = (obj, key, getter) =>
  Object.defineProperty(obj, key, {
    get: getter,
    enumerable: true,
    configurable: true,
  });

function capture(obj, map = {}) {
  for (let fieldName in obj) {
    const field = obj[fieldName];
    if (field instanceof Model) {
      map[fieldName] = {};
      capture(field, map[fieldName]);
    } else {
      if (obj instanceof ArrayModel && fieldName === "$model_methods") continue;
      map[fieldName] = field;
    }
  }
  const getters = getterFunctions(obj);
  for (let getterName in getters) {
    defineGet(map, getterName, getters[getterName]);
  }
  return map;
}

function createModelState(obj, state, setState, trace = [], model = {}) {
  for (let fieldName of fieldNames(obj)) {
    trace.push(fieldName);
    const field = obj[fieldName];
    if (field instanceof Model) {
      model[fieldName] = getModelField(field);
      createModelState(field, state, setState, trace, model[fieldName]);
    } else if (obj instanceof ArrayModel && fieldName === "$model_methods") {
      model["$"] = arrayMethods(field, obj, setState, trace);
    } else {
      const captureTrace = [...trace];
      defineGet(model, fieldName, () => getNested(state, captureTrace));
    }
    trace.pop();
  }
  for (let methodName of methodNames(obj)) {
    const captureTrace = [...trace];
    model[methodName] = (...args) => {
      obj[methodName](...args);
      const newState = pureObject(obj);
      setState(...captureTrace, newState);
    };
  }
  return model;
}

function arrayMethods(methods, obj, setState, trace, map = {}) {
  const captureTrace = [...trace.slice(0, -1), "list"];
  for (let method of methods) {
    map[method] = (i, ...args) => {
      const item = obj["list"][i];
      if (item !== undefined) {
        item[method](...args);
        const newState = pureObject(item);
        setState(...captureTrace, i, newState);
      }
    };
  }
  return map;
}

const getModelField = (field) =>
  field instanceof PrimitiveModel
    ? {
        valueOf() {
          return this.value;
        },
      }
    : field instanceof ArrayModel
    ? {
        [Symbol.iterator]() {
          return this.list.values();
        },
      }
    : {};

export { Model, ArrayModel, PrimitiveModel, useModel };
