# store.add(path, value, key)
| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) to arrive. | `Array` or `String` or `Number` | `[]` |
| value  | The value to add. | any | `undefined`|
| key | The key for the value param. | `String` or `Number` | `undefined` |

This method returns the store itself.

## Examples
The store to use:
```
var JSONStore = require('jsonstore-js'),
    storeData = {
        obj: {color: 'red'},
        arr: ['foo']
    },
    createStore = function(){
        return new JSONStore({store: storeData});
    };
```
### Add a value to an object
```
var store = createStore();

store.add('obj', 'bar');
cosnole.log(store.get('obj'));
// output: {color: 'red'}

store.add('obj', 'bar', 'foo');
console.log(store.get('obj'));
// output: {color: 'red', foo: 'bar'}
```
Adding a value to an object without a key is not valid.

### Add a value to an array
```
var store = createStore();
store.add('arr', 'bar');
console.log(store.get('arr'));
// output: ['foo', 'bar']

store = createStore();
store.add('arr', 'bar', 0);
console.log(store.get('arr'));
// output: ['bar', 'foo']

store = createStore();
store.add('arr', 'bar', 2);
console.log(store.get('arr'));
// output: ['foo', 'bar']

store = createStore();
store.add('arr', 'bar', -1);
console.log(store.get('arr'));
// output: ['bar', 'foo']
```
When adding a value to an array, the key must be a `Number`.
It's equal to `Array.push(value)` without a key, and equal to `Array.splice(key, 0, value)` with a key.
