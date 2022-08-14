# Xmodel
Published Date: 14 Aug 2022 (v1.0.0)


## Advantages
-  Model states can be both global or local.
-  Can share model codes across applications/framework with minimum code refactor
-  Intuitive for MVVM or MVI architecture
-  Less boilerplate/ Straightforward

## Guide

Tired of Redux pattern or using the vanilla solid.js store? This library eliminitates your decision time on state management instead focus on building the actual buisness logic.

A good design pattern is that your buisness logic should be never be tied with state management functions i.e. The core buisness logic must be independent from your app architecture thus it has to be loosely coupled with other components in your architecture.

### Models

Models are the base component of the buisness logic where each model represent the specific domain-logic. MVVM, MVC, MVI and many uses the model in their architecture, hence the model code is portable for any framework. Thus you can port your model created for this library anywhere with minimum or no changes.  

## API
---
`Model`

Base abstract class that need to be extended by your model class.

`PrimitiveModel`

PrimitiveModel is used when the model has only a single primitive variable and has its own set of functions to modify or reuse.

```typescript
constructor(value: Primitive)
value: Primitive
valueOf(): Primitive

type Primitive = string | number | boolean | null | undefined | BigInt | Symbol
```

`ArrayModel`

Array model is used for managing list of models where each model item can be modified directly. Native javascript array of model will not be reactive, thus you need to implement by extending this class for reactive collection of models.


```typescript
constructor(Model: typeof Model) // Here you pass the Model class not the instance
list: Model[]
at(i: number): Model
push(item: Model): void
pop(i?: number, n?: number): Model | undefined 
```