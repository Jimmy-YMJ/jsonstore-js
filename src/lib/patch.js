const utils = require('./utils');

const patchTypes = {
  add: 'add',
  remove: 'remove',
  update: 'update',
  set: 'set',
  moveUp: 'moveUp',
  moveDown: 'moveDown',
  moveTo: 'moveTo',
  exchange: 'exchange',
  extendObject: 'extendObject',
  spreadArray: 'spreadArray',
  spread2dArrayCol: 'spread2dArrayCol',
  spread2dArrayRow: 'spread2dArrayRow'
};

const createPatch = function (type, args) {
  args = Array.prototype.slice.call(args);
  return utils.copy({
    type: type,
    args: args
  });
};

/**
 * create patch operations
 * */

const patchMethods = {
  createAdd: function (path, value, key) {
    return createPatch(patchTypes.add, arguments);
  },
  createRemove: function (path) {
    return createPatch(patchTypes.remove, arguments);
  },
  createUpdate: function (path, value, forceUpdate) {
    return createPatch(patchTypes.update, arguments);
  },
  createSet: function (path, value) {
    return createPatch(patchTypes.set, arguments);
  },
  createMoveUp: function (path) {
    return createPatch(patchTypes.moveUp, arguments);
  },
  createMoveDown: function (path) {
    return createPatch(patchTypes.moveDown, arguments);
  },
  createMoveTo: function (from, to, key) {
    return createPatch(patchTypes.moveTo, arguments);
  },
  createExchange: function (from, to) {
    return createPatch(patchTypes.exchange, arguments);
  },
  createExtendObject: function (path, a, b, c, d, e) {
    return createPatch(patchTypes.extendObject, arguments);
  },
  createSpreadArray: function (path, begin, infilling, simpleInfilling, count) {
    return createPatch(patchTypes.spreadArray, arguments);
  },
  createSpread2dArrayRow: function (path, begin, rows, simpleInfilling, count) {
    return createPatch(patchTypes.spread2dArrayRow, arguments);
  },
  createSpread2dArrayCol: function (path, begin, cols, simpleInfilling, count) {
    return createPatch(patchTypes.spread2dArrayCol, arguments);
  }
};

module.exports = patchMethods;
