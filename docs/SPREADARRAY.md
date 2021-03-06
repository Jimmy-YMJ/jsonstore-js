# store.spreadArray(path, begin, infilling, simpleInfilling, count)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) of array to spread. | `Array` or `String` or `Number` | `[]` |
| begin  | The begin index of array. | `Number` | The length of the array referenced by `path`. |
| infilling | The infilling to fill the array. When the `infilling` is an array, all the items of `infilling` will be added to target array. When `infilling` is a positive number, counts of `infilling` `null` will be added to array. When the `infilling` is a negative number, counts of `infilling` items will be removed. | `Array` or `Number` | `undefined` |
| simpleInfilling  | Whether the param `infilling` is a simple infilling. When it's true, all items of new added will be filled with `infilling`. | `Boolean` | `false` |
| count  | The count of items to spread when `simpleInfilling` is `true`. | `Number` | `1` |

This method returns the store itself.

## Examples
```javascript
var JSONStore = require('jsonstore-js'),
    storeData = ['a', 'b', 'c'],
    createStore = function(){
        return new JSONStore({store: storeData});
    };
    
var store = createStore();
store.spreadArray([], 1, ['d', 'e']);
console.log(store.get());
// output: ['a', 'd', 'e', 'b', 'c']

store = createStore();
store.spreadArray([], -1, ['d', 'e']);
console.log(store.get());
// output: ['a', 'b', 'd', 'e', 'c']

store = createStore();
store.spreadArray([], undefined, ['d', 'e']);
console.log(store.get());
// output: ['a', 'b', 'c', 'd', 'e']

store = createStore();
store.spreadArray([], 0, 2);
console.log(store.get());
// output: ['null', 'null', 'a', 'b', 'c']

store = createStore();
store.spreadArray([], 0, -2);
console.log(store.get());
// output: ['c']

store = createStore();
store.spreadArray([], 3, 'foo', true, 2);
console.log(store.get());
// output: ['a', 'b', 'c', 'foo', 'foo']

```
