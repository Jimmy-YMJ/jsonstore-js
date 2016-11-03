const object = require('../build/modules/lib/object');

it('test object.getObjectKeyByValue', () => {
  var obj = {a: 'a', b: 'b', c: {foo: 'bar'}};
  expect(object.getObjectKeyByValue(obj, 'b')).toBe('b');

  expect(object.getObjectKeyByValue(obj, {foo: 'bar'})).toBe('c');
});

it('test object.extend', () => {
  expect(object.extend({}, {foo: 'foo'}, {bar: 'bar'})).toEqual({foo: 'foo', bar: 'bar'});
});
