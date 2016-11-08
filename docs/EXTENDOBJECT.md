# store.extendObject(path, a, b, c, d, e)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) of object to extend. | `Array` or `String` or `Number` | `[]` |
| a, b, c, d, e  | The sources to use to extend target object. | `Object` | `undefined`. |

This method returns the store itself.

## Examples
```javascript
var JSONStore = require('jsonstore-js'),
    storeData = {foo: 'foo'},
    createStore = function(){
        return new JSONStore({store: storeData});
    };
    
var store = createStore();
store.extendObject([], {bar: 'bar'}, {baz: 'baz'});
console.log(store.get());
// output: {foo: 'foo', bar: 'bar', baz: 'baz'}
```
