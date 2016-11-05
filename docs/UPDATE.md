# store.update(path, value, forceUpdate)
| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The (path)[https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param] to arrive. | `Array` or `String` or `Number` | `[]` |
| value  | The value used to update. | any | `undefined`|
| forceUpdate | Add the value to `path` referenced data when it's `true`. | `Boolean` | `false` |

This method returns the store itself.

## Examples
The store to use:
```
var JSONStore = require('jsonstore-js'),
    storeData = { color: 'red' },
    createStore = function(){
        return new JSONStore({store: storeData});
    };
```
### Update a value
```
var store = createStore();

store.update('color', 'green');
cosnole.log(store.get());
// output: {color: 'green'}

store.update('name', 'foo');
cosnole.log(store.get());
// output: {color: 'green'}
```
### Update a value with `forceUpdate = true`
```
store.update('name', 'foo', true);
cosnole.log(store.get());
// output: {color: 'green', name: 'foo'}
```
