# store.spread2dArrayRow(path, begin, rows)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The (path)[https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param] of array to spread. | `Array` or `String` or `Number` | `[]` |
| begin  | The begin index of array row. | `Number` | The length of the array referenced by `path`. |
| rows | The rows to fill the array. When the `rows` is an array, all the row of `rows` will be added to target array. When `rows` is a positive number, counts of `rows` `null`s will be added to array. When the `rows` is a negative number, counts of `rows` rows will be removed. | `Array` or `Number` | `undefined` |

This method returns the store itself.

## Examples
```
var JSONStore = require('jsonstore-js'),
    storeData = [
        ['a', 'b'],
        ['c', 'd']
    ],
    createStore = function(){
        return new JSONStore({store: storeData});
    };
    
var store = createStore();
store.spread2dArrayRow([], 1, [['e', 'f'], ['g', 'h']]);
console.log(store.get());
/**
* output:
* [
*   ['a', 'b'],
*   ['e', 'f'],
*   ['g', 'h'],
*   ['c', 'd']
* ]
*/

var store = createStore();
store.spread2dArrayRow([], undefined, [['e', 'f'], ['g', 'h']]);
console.log(store.get());
/**
* output:
* [
*   ['a', 'b'],
*   ['c', 'd'],
*   ['e', 'f'],
*   ['g', 'h']
* ]
*/

var store = createStore();
store.spread2dArrayRow([], undefined, 2);
console.log(store.get());
/**
* output:
* [
*   ['a', 'b'],
*   ['c', 'd'],
*   [null, null],
*   [null, null]
* ]
*/

var store = createStore();
store.spread2dArrayRow([], 0, -1);
console.log(store.get());
/**
* output:
* [
*   ['c', 'd']
* ]
*/
```
