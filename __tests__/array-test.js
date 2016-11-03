const array = require('../build/modules/lib/array');

it('test array.createArray', () => {
  expect(array.createArray(3, 'a'))
    .toEqual(['a', 'a', 'a']);
});

it('test array.create2dArray', () => {
  expect(array.create2dArray(2, 2, 'a'))
    .toEqual([['a', 'a'], ['a', 'a']]);
});

it('test array.spreadArray', () => {
  var arr = ['a', 'a'];
  array.spreadArray(arr, 0, 2);
  expect(arr).toEqual([null, null, 'a', 'a']);

  arr = ['a', 'a'];
  array.spreadArray(arr, -1, ['c', 'c']);
  expect(arr).toEqual(['a', 'c', 'c', 'a']);

  arr = ['a', 'a'];
  array.spreadArray(arr, -1, 2);
  expect(arr).toEqual(['a', null, null, 'a']);

  arr = ['a', 'a'];
  array.spreadArray(arr, 0, -1);
  expect(arr).toEqual(['a']);
});

it('test array.spread2dArrayRow', () => {
  var arr = [['a']];
  array.spread2dArrayRow(arr, 1, [['c']]);
  expect(arr).toEqual([['a'], ['c']]);

  arr = [['a']];
  array.spread2dArrayRow(arr, -2, [['c']]);
  expect(arr).toEqual([['c'], ['a']]);

  arr = [['a', 'b']];
  array.spread2dArrayRow(arr, -2, 2);
  expect(arr).toEqual([[null, null], [null, null], ['a', 'b']]);

  arr = [['a'], ['c']];
  array.spread2dArrayRow(arr, -1, -1);
  expect(arr).toEqual([['a']]);
});

it('test array.spread2dArrayCol', () => {
  var arr = [['a']];
  array.spread2dArrayCol(arr, 1, [['c']]);
  expect(arr).toEqual([['a', 'c']]);

  arr = [['a'], ['b']];
  array.spread2dArrayCol(arr, -2, [['c'], ['d']]);
  expect(arr).toEqual([['c', 'a'], ['d', 'b']]);

  arr = [['a']];
  array.spread2dArrayCol(arr, -2, 2);
  expect(arr).toEqual([[null, null, 'a']]);

  arr = [['a', 'c']];
  array.spread2dArrayCol(arr, -2, -1);
  expect(arr).toEqual([['c']]);
});

it('test array.moveArrayItemUp', () => {
  var arr = ['a', 'b', 'c'];
  array.moveArrayItemUp(arr, 1);
  expect(arr).toEqual(['b', 'a', 'c']);

  arr = ['a', 'b', 'c'];
  array.moveArrayItemUp(arr, 0);
  expect(arr).toEqual(['a', 'b', 'c']);
});

it('test array.moveArrayItemDown', () => {
  var arr = ['a', 'b', 'c'];
  array.moveArrayItemDown(arr, 1);
  expect(arr).toEqual(['a', 'c', 'b']);

  arr = ['a', 'b', 'c'];
  array.moveArrayItemDown(arr, 2);
  expect(arr).toEqual(['a', 'b', 'c']);
});

it('test array.getArrayIndexByValue', () => {
  var arr = ['a', 'b', 'c'];
  expect(array.getArrayIndexByValue(arr, 'c')).toBe(2);
  expect(array.getArrayIndexByValue(arr, 'd')).toBe(-1);

  arr = ['a', {b: 'b', foo: 'bar'}, 'c'];
  expect(array.getArrayIndexByValue(arr, {foo: 'bar'})).toBe(1);
});
