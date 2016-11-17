# store.do([name,] action, a, b, c, d, e, f)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| name | The name of this 'do' action, it is designed to debugging, but temporarily not used. | `String` | `''`|
| action  | A callback which will be executed by passing a `store` and `a`, `b`, `c`, `d`, `e`, `f`. | `Function` | `undefined` |
| a, b, c, d, e, f | These will be passed to `action` as parameters. | any | `undefined`|

This method executes and record store operations in it's `action` param. The value returned by `store.do` is an object like:
 ```javascript
 {
    patches: [...], // the really patches on store
    relativePatches: [...], // patches with paths relative to the path of 'store.goTo(path)'
    backPatches: [...] // patches to rollback
 }
 ```
 
## Examples
```javascript
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

var action = function(store, foo, bar){
    store.goTo(['books', {__value: {id: 'book2'}}])
        .remove(['content', 0])
        .update(['content', {__value: 'lemon'}], 'grape');
            
    console.log(foo);
    console.log(bar);
}

store.do('a test', action, 'foo', 'bar');
/**
* The output is:
* 'foo'
* 'bar'
*/


console.log(store.get(['books', 1]));

/**
* The output is:
* {id:'book2', name: 'fruits', content: ['orange', 'grape']}
*/

```
