const JSONStore = require('../build/store.min');

const storeData = {
  name: 'book',
  arr: [
    ['a', 'b'],
    ['c', 'd'],
    ['e', 'f']
  ],
  content: [
    {type: 'h1', content: "This is a fantastic book, enjoy it please."},
    {type: 'text', content: 'Nothing is here at this moment.'}
  ],
  children: [
    {type: 'chapter', name: 'chapter1', content: [{type: 'h2', content: 'This is chapter1.'}]},
    {type: 'chapter', name: 'chapter2', content: [{type: 'h2', content: 'This is chapter2.'}]}
  ]
};

const validateStore = function (store) {
  expect(store.patches).toEqual([]);
  expect(store.relativePatches).toEqual([]);
  expect(store.backPatches).toEqual([]);
  expect(store.currentPath).toEqual([]);
  expect(store.isDoing).toBe(false);
};

const validateMethodResult = function (result, store, inDoing) {
  expect(result).toBe(store);
  if(inDoing === false){
    validateStore(store);
  }
};

const validateBackPatches = function (store, operationCallback) {
  var backPatches = store.do(operationCallback).backPatches;
  expect(store.applyPatch(backPatches).get())
    .toEqual(storeData);
};

const createStore = function () {
  return new JSONStore({store: storeData});
};

it('test sore._formatPath', () => {
  var store = new JSONStore({store: storeData});
  expect(store._formatPath('name')).toEqual(['name']);
  expect(store._formatPath('username')).toBe(null);
  expect(store._formatPath(['name'])).toEqual(['name']);
  expect(store._formatPath(['content', {__value: {type: 'h1'}}])).toEqual(['content', 0]);
  expect(store._formatPath(['children', {__value: {type: 'chapter'}}, 'content', {__value: {type: 'h2'}}]))
    .toEqual(['children', 0, 'content', 0]);
  expect(store._formatPath(['children', {__value: {name: "chapter2"}}]))
    .toEqual(['children', 1]);
});

it('test store.add', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.add(['content'], 'content', 0), store, inDoing);
    validateMethodResult(store.add([], 'foo'), store, inDoing);
    validateMethodResult(store.add([], 'bar', 'foo'), store, inDoing);
    expect(store.get(['content', 0])).toBe('content');
    expect(store.get('foo')).toBe('bar');
  };
  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.remove', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.remove('name'), store, inDoing);
    validateMethodResult(store.remove('foo'), store, inDoing);
    expect(store.get('name')).toBe(undefined);
  };
  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.update', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.update(['children', {__value: {name: 'chapter1'}}, 'content'], 'updated content'), store, inDoing);
    expect(store.get(['children', {__value: {name: 'chapter1'}}, 'content']))
      .toBe('updated content');

    validateMethodResult(store.update(['content', 4], 'foo'), store, inDoing);
    expect(store.get(['content', 4])).toBe(undefined);

    validateMethodResult(store.update(['content', 4], 'foo', true), store, inDoing);
    expect(store.get(['content', 2])).toBe('foo');
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.moveUp', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.moveUp(['content', 1]), store, inDoing);
    expect(store.get(['content', 1, 'type'])).toBe('h1');

    validateMethodResult(store.moveUp(['content', 0]), store, inDoing);
    expect(store.get(['content', 0, 'type'])).toBe('text');

    validateMethodResult(store.moveUp('content'), store, inDoing);
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.moveDown', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.moveDown(['content', 0]), store, inDoing);
    expect(store.get(['content', 0, 'type'])).toBe('text');

    validateMethodResult(store.moveDown(['content', 1]), store, inDoing);
    expect(store.get(['content', 1, 'type'])).toBe('h1');

    validateMethodResult(store.moveDown('content'), store, inDoing);
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.moveTo', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.moveTo(['children', 0, 'name'], ['content'], 1), store, inDoing);
    expect(store.get(['content', 1])).toBe('chapter1');
    expect(store.get(['children', 0])).toEqual({type: 'chapter', content: [{type: 'h2', content: 'This is chapter1.'}]});
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.exchange', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.exchange(['content', 0], ['children', 0]), store, inDoing);
    expect(store.get(['content', 0])).toEqual({type: 'chapter', name: 'chapter1', content: [{type: 'h2', content: 'This is chapter1.'}]});
    expect(store.get(['children', 0])).toEqual({type: 'h1', content: "This is a fantastic book, enjoy it please."});
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.spreadArray', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.spreadArray('content', undefined, ['something']), store, inDoing);
    expect(store.get(['content', 2])).toBe('something');
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.spread2dArrayRow', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.spread2dArrayRow('arr', 1, 2), store, inDoing);
    expect(store.get('arr')).toEqual([
      ['a', 'b'],
      [null, null],
      [null, null],
      ['c', 'd'],
      ['e', 'f']
    ]);

    validateMethodResult(store.spread2dArrayRow('arr', 1, [['g', 'h']]), store, inDoing);
    expect(store.get('arr')).toEqual([
      ['a', 'b'],
      ['g', 'h'],
      [null, null],
      [null, null],
      ['c', 'd'],
      ['e', 'f']
    ]);

    validateMethodResult(store.spread2dArrayRow('arr', 2, -2), store, inDoing);
    expect(store.get('arr')).toEqual([
      ['a', 'b'],
      ['g', 'h'],
      ['c', 'd'],
      ['e', 'f']
    ]);
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});

it('test store.spread2dArrayCol', () => {
  var storeOperation = function (store, inDoing) {
    validateMethodResult(store.spread2dArrayCol(['arr'], 1, 2), store, inDoing);
    expect(store.get('arr')).toEqual([
      ['a', null, null, 'b'],
      ['c', null, null, 'd'],
      ['e', null, null, 'f']
    ]);

    validateMethodResult(store.spread2dArrayCol('arr', 1, [['g'], ['h'], ['i']]), store, inDoing);
    expect(store.get('arr')).toEqual([
      ['a', 'g', null, null, 'b'],
      ['c', 'h', null, null, 'd'],
      ['e', 'i', null, null, 'f']
    ]);

    validateMethodResult(store.spread2dArrayCol('arr', 2, -2), store, inDoing);
    expect(store.get('arr')).toEqual([
      ['a', 'g', 'b'],
      ['c', 'h', 'd'],
      ['e', 'i', 'f']
    ]);
  };

  storeOperation(createStore(), false);
  validateBackPatches(createStore(), storeOperation);
});


it('test store.do', () => {
  var store = createStore();
  var result = store.do(function (store) {
    store
      .goTo(['children', 0])
      .add('content', 'foo')
      .remove('type')
      .goTo(['content', 0], true)
      .add([], 'new content', 'content1');
  });
  validateStore(store);
  expect(store.get(['children', 0]))
    .toEqual({
      name: 'chapter1',
      content: [{type: 'h2', content: 'This is chapter1.', content1: 'new content'}, 'foo']}
    );
  store.applyPatch(result.backPatches);
  expect(store.get(['content', 0]))
    .toEqual(storeData['content'][0]);
});
