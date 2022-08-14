type Primitives =
  | string
  | number
  | boolean
  | BigInt
  | null
  | undefined
  | Symbol;

declare class Model {
  private $model: number;
}
declare class ArrayModel<T extends Model> extends Model {
  private $model_methods: string[];
  list: T[];
  constructor(modelClass: typeof T);
  protected at(i: number): T;
  protected push(a: Model): void;
  protected pop(i: number, n?: number): void;
}
declare class PrimitiveModel<T extends Primitives> extends Model {
  value: T;
  constructor(value: T);
  valueOf(): T;
}

type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];
type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

type ToArrayMethod<T> = {
  [K in keyof T]: (i: number, ...args: Parameters<T[K]>) => ReturnType<T[K]>;
};
// Parameters<T[K]>
type ModelState<T> = {
  [K in keyof T]: T[K] extends Model ? ModelState<T[K]> : T[K];
} & ArrayProp<T>;

type ArrayMethods<M> = {
  $: ToArrayMethod<FunctionProperties<M>>;
};
type ArrayProp<T> = T extends ArrayModel<infer I> ? ArrayMethods<I> : {};

declare function useModel<T extends typeof Model>(
  model: T,
  args?: []
): ModelState<InstanceType<T>>; // TODO

export { Model, ArrayModel, PrimitiveModel, useModel };
