# store.moveTo(from, to, key)

| **Param** | **Description** | **type** | **default** |
| --- | --- | --- | --- |
| from  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) of value to move. | `Array` or `String` or `Number` | `[]` |
| to  | The [path](https://github.com/Jimmy-YMJ/jsonstore-js#about-the-path-param) of target to put the `from`. | `Array` or `String` or `Number` | `[]`|
| key | The key for the `from` value in `to`. | `String` or `Number` | `undefined` |

This method is a combination of [remove](https://github.com/Jimmy-YMJ/jsonstore-js/blob/master/docs/REMOVE.md) and [add](https://github.com/Jimmy-YMJ/jsonstore-js/blob/master/docs/ADD.md).

```
store.moveTo(from, to, key);
```
is equal to:
```
store.add(to, store.get(from), key);
store.remove(from);
```
If the `from` or `to` is not exists, this method will do nothing.

This method returns the store itself.