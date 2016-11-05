# store.do(callback)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| callback  | A callback which will be executed by passing a store param. | `Function` | `undefined` |

This method executes and record store operations in it's callback param. The value returned by `store.do` is an object like:
 ```
 {
    patches: [...], // the really patches on store
    relativePatches: [...], // patches with paths relative to the path of 'store.goTo(path)'
    backPatches: [...] // patches to rollback
 }
 ```
 
## Examples
```
var JSONStore = require('jsonstore-js');
var storeData = {
    name: 'A store',
    books: [
        {id: 'book1', name: 'colors', content: ['red', 'green', 'blue']},
        {id: 'book2', name: 'fruits', content: ['apple', 'orange', 'lemon']}
    ]
};
var store = new JSONStore({
    store: storeData
});

store.do(functon(store){
    store.goTo(['books', {__value: {id: 'book2'}}])
        .remove(['content', 0])
        .update({__value: 'lemon'}, 'grape');
});

console.log(store.get(['books', 1]));
/**
* The output is:
* {id:'book2', name: 'fruits', content: ['orange', 'grape']}
*/

```
