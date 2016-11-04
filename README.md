# jsonstore-js
A data store for processing javascript JSON data expediently.

## Installing
Use via npm:
```bash
$ npm install jsonstore-js --save
```
```javascript
var JSONStore = require('jsonstore-js');
```
Use in browser:

Scripts for browser is under [build](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/build) directory, use `store.js` for development environment(contains inline source maps) or use `store.min.js` for production.
The reference in browser is `window.JSONStore`.

## Usages
This store is used for javascript data that can be converted to JSON, that is to say the safe javascript data types are: `Null`, `String`, `Number`, `Boolean`, `Array` and plain `Object`.
It uses `JSON.parse(JSON.stringify(data))` to copy data, there are some(not all) side-effects you may want to know when using unsafe javascript types:

- Using `Undefined` type or `Function` type data to construct a store will cause an error.
- `Undefined` type or `Function` type data contained in an object will be removed.
- `Undefined` type or `Function` type data contained in an array will be replaced to `Null`.
- `Date` type data will be converted to a date string.
- `RegExp` type data will be converted to an empty object.

Although the store has some constraints to using all javascript data types, it is natural and safe to construct a store using data that comes from a http request whether in browser or server side nodejs.
Further more, JSON is designed to be a lightweight data-interchange format, it's enough and concise to use JSON data types to represent a structured data.

### Examples
The store we are going to use in examples is:
```javascript
var JSONStore = require('jsonstore-js');
var storeData = {
    name: 'A store',
    books: [
        {id: 'abc', name: 'colors', content: ['red', 'green', 'blue']},
        {id: 'def', name: 'fruits', content: ['apple', 'orange', 'lemon']}
    ]
};
var store = new JSONStore({
    store: storeData
});

```
#### Traverse store and get data:
```javascript
console.log(store.get( 'foo' )); // output: undefined
console.log(store.get( 'name' )); // output: 'A book'
console.log(store.get( ['name'] )); // output: 'A book'
console.log(store.get( ['books', 0, 'name'] )); // output: 'colors'
console.log(store.get( ['books', {__value: {name: 'colors'}}, 'content', 0] )); // output: 'red'
console.log(store.get( ['books', 0, 'content', {__value: 'red'}, 1] )); // output: 'green'
```

#### Changing the store
```javascript
store.add('books', 'book3')
    .exchange(['books', 0], ['books', 1]);
    
console.log(store.get( 'books' ));
/**
* The output is:
* [
*   {id: 'def', name: 'fruits', content: ['apple', 'orange', 'lemon']},
*   {id: 'abc', name: 'colors', content: ['red', 'green', 'blue']},
*   'book3'
* ]
*/
```

#### Changing the store and rollback
```javascript
var results = store.do(functon(store){
    store.goTo(['books', {__value: {name: 'fruits'}}])
        .remove(['content', 0])
        .update({__value: 'lemon'}, 'grape');
    console.log(store.get(['books', 1]));
    /**
    * The output is:
    * {id: 'def', name: 'fruits', content: ['orange', 'grape']}
    */
});

store.applyPatch(results.backPatches);
console.log(store.get(['books', 1]));
/**
* The output is:
* {id: 'def', name: 'fruits', content: ['apple', 'orange', 'lemon']}
*/
```
#### Changing the store and update corresponding server side data
Suppose the books of the example store come from a server side table named **book**.
When you update one book in store, You may want to make an ajax request to update the same book in database and rollback the store changes when the ajax request is failure.
These can be done with **jsonstore-js** easily:
```javascript
var results = store.do(functon(store){
    store.goTo(['books', {__value: {id: 'def'}}])
        .remove(['content', 0])
        .update({__value: 'lemon'}, 'grape');
    console.log(store.get(['books', 1]));
    /**
    * The output is:
    * {id:'def', name: 'fruits', content: ['orange', 'grape']}
    */
});

jQuery.ajax({
    method: "PATCH",
    url: "/books/def",
    data: results.relativePatches,
    success: function() {
      // do something
    },
    error: function(){
      store.applyPatch(results.backPatches);
    }
  });

// server side pseudo-codes
var patches = request.body,
    book = getBookById('def'),
    store = new JSONStore({store: book});
    
var newBook = store.applyPatch(patches).get();

saveBookById('def', newBook);
```
The `store.do` method executes and record store operations in it's callback param. The value returned by `store.do` is an object like:
 ```
 {
    patches: [...], // the really patches on store
    relativePatches: [...], // patches with paths relative to the path of 'store.goTo(path)'
    backPatches: [...] // patches to rollback
 }
 ```
## APIs

### 

### Data processing methods:
- [store.add](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/ADD.md)
- [store.remove](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/REMOVE.md)
- [store.update](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/UPDATE.md)
- [store.moveUp](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/MOVEUP.md)
- [store.moveDown](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/MOVEDOWN.md)
- [store.moveTo](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/MOVETO.md)
- [store.exchange](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/EXCHANGE.md)
- [store.spreadArray](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/SPREADARRAY.md)
- [store.spread2dArrayRow](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/SPREAD2DARRAYROW.md)
- [store.spread2dArrayCol](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/SPREAD2DARRAYCOL.md)

### Operation flows managing methods:
- [store.do](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/DO.md)
- [store.goTo](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/GOTO.md)
- [store.applyPatch](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/APPLYPATCH.md)
- [store.patch.*](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/PATCH.md)

## License
MIT
