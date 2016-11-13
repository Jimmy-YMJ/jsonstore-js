# store.spread2dArrayCol(path, begin, cols, simpleInfilling, count)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) of array to spread. | `Array` or `String` or `Number` | `[]` |
| begin  | The begin index of array column. | `Number` | The length of the array referenced by `path`. |
| cols | The columns to fill the array. When the `cols` is an array, each items of `cols` will be added to target array column. When `cols` is a positive number, counts of `cols` `null`s will be added to each col. When the `cols` is a negative number, counts of `cols` columns will be removed. | `Array` or `Number` | `undefined` |
| simpleInfilling  | Whether the param `cols` is a simple infilling. When it's true, all items of new added will be filled with `cols`. | `Boolean` | `false` |
| count  | The count of columns to spread when `simpleInfilling` is `true`. | `Number` | `1` |

This method returns the store itself.

## Examples
```javascript
var JSONStore = require('jsonstore-js'),
    storeData = [
        ['a', 'b'],
        ['c', 'd']
    ],
    createStore = function(){
        return new JSONStore({store: storeData});
    };
    
var store = createStore();
store.spread2dArrayCol([], 1, [['e', 'f'], ['g', 'h']]);
console.log(store.get());
/**
* output:
* [
*   ['a', 'e', 'f', 'b'],
*   ['c', 'g', 'h','d']
* ]
*/

var store = createStore();
store.spread2dArrayCol([], undefined, [['e', 'f'], ['g', 'h']]);
console.log(store.get());
/**
* output:
* [
*   ['a', 'b', 'e', 'f'],
*   ['c', 'd', 'g', 'h']
* ]
*/

var store = createStore();
store.spread2dArrayCol([], undefined, 2);
console.log(store.get());
/**
* output:
* [
*   ['a', 'b', null, null],
*   ['c', 'd', null, null]
* ]
*/

var store = createStore();
store.spread2dArrayCol([], 0, -1);
console.log(store.get());
/**
* output:
* [
*   ['b'],
*   ['d']
* ]
*/

var store = createStore();
store.spread2dArrayCol([], 0, 'foo', true, 2);
console.log(store.get());
/**
* output:
* [
*   ['foo', 'foo', 'a', 'b'],
*   ['foo', 'foo', 'c', 'd']
* ]
*/
```
