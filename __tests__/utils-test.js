const utils = require('../build/modules/lib/utils');

const testCases = ['str', 5, false, null, [], {}];

it('test utils.type', () => {
  testCases.forEach((item, index) => {
    var type = utils.type(item);
    switch (index){
      case 0:
        expect(type).toBe('string');
        break;
      case 1:
        expect(type).toBe('number');
        break;
      case 2:
        expect(type).toBe('boolean');
        break;
      case 3:
        expect(type).toBe('null');
        break;
      case 4:
        expect(type).toBe('array');
        break;
      case 5:
        expect(type).toBe('object');
        break;
    }
  });
});

it('test utils.copy', () => {
  var arr = ['a', 'b', 'c'];
  var copy = utils.copy(arr);
  copy[0] = 'foo';
  expect(arr).toEqual(['a', 'b', 'c']);
  expect(copy).toEqual(['foo', 'b', 'c']);
});

it('test urils.isReferenceTpe', () => {
  testCases.forEach((item, index) => {
    var isReferenceType = utils.isReferenceType(item);
    switch (index){
      case 0:
        expect(isReferenceType).toBe(false);
        break;
      case 1:
        expect(isReferenceType).toBe(false);
        break;
      case 2:
        expect(isReferenceType).toBe(false);
        break;
      case 3:
        expect(isReferenceType).toBe(false);
        break;
      case 4:
        expect(isReferenceType).toBe(true);
        break;
      case 5:
        expect(isReferenceType).toBe(true);
        break;
    }
  });
});
