# store.exchange(from, to)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| from  | The (path)[https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param] of value to exchange. | `Array` or `String` or `Number` | `[]` |
| to  | The (path)[https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param] of value to exchange. | `Array` or `String` or `Number` | `[]`|

This method is a combination of (update)[https://github.com/Jimmy-YMJ/jsonstore-js/blob/master/docs/UPDATE.md].

This method returns the store itself.

```
store.exchange(from, to);
```
is equal to:
```
var fromRef = this._getRef(from),
    toRef = this.get(to);
    
this.update(from, toRef);
this.update(to, fromRef);
```
If the `from` or `to` is not exists, this method will do nothing.
