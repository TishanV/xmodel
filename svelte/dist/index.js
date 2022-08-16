import { writable, derived } from "svelte/store";

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
  const initState = pureObject(modelObject);
  const state = writable(initState);
  const stateModel = createModelState(modelObject, state);
  return stateModel;
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

function getNested(obj, keys) {
  if (!keys.length) return obj;
  const key = keys[0];
  return getNested(obj[key], keys.slice(1));
}

function produce(keys, v, array = false) {
  return (s) => {
    while (keys.length) {
      const key = keys.pop();
      v = Object.assign({}, getNested(s, keys), { [key]: v });
      if (array && typeof key === "number") v = Object.values(v);
    }
    return v;
  };
}

function arrayMethods(methods, obj, update, trace, map = {}) {
  const captureTrace = [...trace.slice(0, -1), "list"];
  for (let method of methods) {
    map[method] = (i, ...args) => {
      const item = obj["list"][i];
      if (item !== undefined) {
        item[method](...args);
        const newState = pureObject(item);
        update(produce([...captureTrace, i], newState, true));
      }
    };
  }
  return map;
}

function facadeState(obj, state, map = {}) {
  for (let fieldName in obj) {
    const field = obj[fieldName];
    if (obj instanceof ArrayModel && fieldName === "$model_methods") continue;
    if (field instanceof PrimitiveModel) {
      map[fieldName] = state[fieldName]["value"];
      map["_" + fieldName] = {};
      facadeState(field, state[fieldName], map["_" + fieldName]);
    } else if (field instanceof ArrayModel) {
      map[fieldName] = state[fieldName]["list"];
      map["_" + fieldName] = {};
      facadeState(field, state[fieldName], map["_" + fieldName]);
    } else if (field instanceof Model) {
      map[fieldName] = map[fieldName] || {};
      facadeState(field, state[fieldName], map[fieldName]);
    } else {
      map[fieldName] = state[fieldName];
    }
  }
  const getters = getterFunctions(obj);
  for (let getterName in getters) {
    map[getterName] = getters[getterName].call(state);
  }
  return map;
}

function addMethods(obj, update, map, trace = []) {
  for (let fieldName in obj) {
    trace.push(fieldName);
    const field = obj[fieldName];
    if (field instanceof Model) {
      map[fieldName] = map[fieldName] || {};
      addMethods(field, update, map[fieldName], trace);
    } else if (obj instanceof ArrayModel && fieldName === "$model_methods") {
      map["$"] = arrayMethods(field, obj, update, trace);
    }
    trace.pop();
  }
  for (let methodName of methodNames(obj)) {
    const captureTrace = [...trace];
    map[methodName] = (...args) => {
      obj[methodName].call(obj, ...args);
      update(produce([...captureTrace], pureObject(obj)));
    };
  }
  return map;
}

function createModelState(obj, store) {
  const model = Object.create(
    derived(store, ($store) => facadeState(obj, $store))
  );
  addMethods(obj, store.update, model);
  return model;
}

export { Model, ArrayModel, PrimitiveModel, useModel };
