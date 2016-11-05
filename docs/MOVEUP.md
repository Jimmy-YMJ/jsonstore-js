# store.moveUp(path)
| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The (path)[https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param] to arrive. | `Array` or `String` or `Number` | `[]` |

Move up the item referenced by `path` if the item is in an array.

This method returns the store itself.

## Examples
```
var JSONStore = require('jsonstore-js'),
    storeData = ['a', 'b', 'c'],
    createStore = function(){
        return new JSONStore({store: storeData});
    };
    
var store = createStore();
store.moveUp(1);
console.log(store.get());
// output: ['b', 'a', 'c']
```
