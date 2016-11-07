# store.do([name,] action, data)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| name | The name of this 'do' action, it will be passed to `action` as `name` param and it's optional, | `String` | `''`|
| action  | A callback which will be executed by passing a store , `data` and `name`. | `Function` | `undefined` |
| data | It will be passed to `action` as `data` param. | any | `undefined`|

This method executes and record store operations in it's `action` param. The value returned by `store.do` is an object like:
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

store.do('a test', functon(store, data, name){
    store.goTo(['books', {__value: {id: 'book2'}}])
        .remove(['content', 0])
        .update({__value: 'lemon'}, 'grape');
        
    console.log(data);
    /**
    * The output is:
    * {bar: 'bar'}
    */
    
    console.log(name);
    /**
    * The output is:
    * 'a test'
    */
}, {bar: 'bar'});

console.log(store.get(['books', 1]));

/**
* The output is:
* {id:'book2', name: 'fruits', content: ['orange', 'grape']}
*/

```
