# Xmodel for Svelte
Published Date: 14 Aug 2022 (v1.0.0)

> **Only for Svelte apps.**

Visit Github page for other frameworks (React, Solid.js).

```bash
    npm i xmodel-svelte
    # or 
    yarn add xmodel-svelte
```
---
## Advantages
-  Model states can be both global or local.
-  Can share model codes across applications/framework with minimum code refactor
-  Intuitive for MVVM or MVI architecture
-  Less boilerplate/ Straightforward
---
## Intro

Tired of Redux or using the useReducer or other Flux pattern? This library eliminitates your decision time on state management instead focus on building the actual buisness logic in OOP style.

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

`useModel(modelClass: Model, args?: string[])`

This function is used to convert your model class into reactive state which can be used anywhere in your application.

> Note: It can be called outside the jsx component thus making it available globally.

---
## Example (Todo App)

```typescript
// ./models/Todo.ts
import { Model } from "xmodel-svelte";

class Todo extends Model {
    task: string;
    isDone: boolean;

    constructor(task: string) {
        super();
        this.task = task;
        this.isDone = false;
    }

    changeTask(task: string) {
        this.task = task;
    }

    toggleDone() {
        this.isDone = !this.isDone;
    }
}

export default Todo;

```

```typescript
// ./models/TodoList.ts
import { ArrayModel } from "xmodel-svelte";
import Todo from "./Todo";

class TodoList extends ArrayModel<Todo> {
  constructor() {
    super(Todo);
  }

  add(task: string) {
    this.push(new Todo(task));
    // push method is available on ArrayModel
    // If you need use native methods of array you can directly modify on this.list
  }

  delete(i: number) {
    this.pop(i);
    // This pop function can remove item at any index like in Python
    // Not only removes 1 element but also subsequent n items by passing it as second arg.
  }
}

export default TodoList;
```

```typescript
// ./App.svelte
<script lang="ts">
  import { useModel } from "xmodel-svelte";
  import TodoList from "./models/TodoList";
  import TodoView from "./lib/Todo.svelte";

  let jotter: HTMLInputElement;

  const todos = useModel(TodoList);
  const addTodo = () => todos.add(jotter.value);
</script>

<div>
  <input bind:this={jotter} placeholder="Jot task" />
  <button on:click={addTodo}>Add Task</button>
</div>
{#each $todos.list as todo, i}
  <TodoView
    task={todo.task}
    isDone={todo.isDone}
    onDelete={() => todos.delete(i)}
    toggleDone={() => todos.$.toggleDone(i)}
  />
{/each}
```