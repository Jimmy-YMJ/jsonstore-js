# store.patch.create*

Each [data processing methods](https://github.com/Jimmy-YMJ/jsonstore-js#data-processing-methods) has a corresponding patch creator, and they accept the same params.

- createAdd(path, value, key)
- createRemove(path)
- createUpdate(path, value, forceUpdate)
- createMoveUp(path)
- createMoveDown(path)
- createMoveTo(from, to, key)
- createExchange(from, to)
- createExtendObject(path, a, b, c, d, e)
- createSpreadArray(path, begin, infilling)
- createSpread2dArrayRow(path, begin, rows)
- createSpread2dArrayCol(path, begin, cols)
