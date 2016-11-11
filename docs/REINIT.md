# store.reInit(options)
| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| options  | The same as constructor options. | `Object` | previous options used by `reInit` method or the constructor |

This method returns the store itself.

## Examples
```javascript
var JSONStore = require('jsonstore-js'),
    storeData = {
        obj: {color: 'red'},
        arr: ['foo']
    };
    
var store = new JSONStore({store: storeData});

store.remove('arr');
console.log(store.get());
/**
* output:
* {obj: {color; 'red'}}
*/

store.reInit();
console.log(store.get());
/**
* output:
* {obj: {color; 'red'}, arr: ['foo']}
*/
```