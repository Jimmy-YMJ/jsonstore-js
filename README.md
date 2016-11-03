# jsonstore-js
A JSON data store for processing JSON data expediently.

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




## APIs

Data processing methods:
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

Operation flows managing methods:
- [store.do](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/DO.md)
- [store.goTo](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/GOTO.md)
- [store.applyPatch](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/APPLYPATCH.md)
- [store.patch.*](https://github.com/Jimmy-YMJ/jsonstore-js/tree/master/docs/PATCH.md)

## License
MIT
