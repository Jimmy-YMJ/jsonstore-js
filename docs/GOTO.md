# store.goTo(path, addUp)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| path  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) to arrive. | `Array` or `String` or `Number` | `[]` |
| addUp  | Whether to add up the path  | `Boolean` | `false`|

This method can only be used in [store.do(callback)](https://github.com/Jimmy-YMJ/jsonstore-js/blob/master/docs/DO.md) callback.

This method returns the store itself.

## Examples
```javascript
var JSONStore = require('jsonstore-js'),
    storeData = {
        name: 'A store',
        books: [
            {id: 'book1', name: 'colors', content: ['red', 'green', 'blue']},
            {id: 'book2', name: 'fruits', content: ['apple', 'orange', 'lemon']}
        ]
    },
    store = new JSONStore({store: storeData});

store.do(functon(store){
    store.goTo(['books']) // the current path is ['books'].
        .goTo(['content']); // the current path is [], because the path ['content'] does not exists.
        
    store.goTo(['books']) // the current path is ['books'].
            .goTo(['content'], true); // the current path is ['books', 'content'].
});

console.log(store.get(['books', 1]));
```
