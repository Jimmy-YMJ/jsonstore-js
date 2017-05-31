(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JSONStore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

/**
 * options:
 *  store
 *  copyStore
 *  cacheKeys
 *  localStorage
 * **/

var utils = _dereq_('./utils');
var array = _dereq_('./array');
var object = _dereq_('./object');
var patchMethods = _dereq_('./patch');
var JSON_STORE_CACHE_KEY_PREFIX = 'JSON_STORE_CACHE_KEY_PREFIX';
var emptyFunc = function emptyFunc() {};

function JSONDataStore(options) {
  options = options || {};
  this.initialOptions = utils.copy(options);
  var store = options.store,
      copyStore = options.copyStore !== false;
  this.store = copyStore ? utils.copy(store) : store;
  this.cacheKeys = this._getCacheKeysMap(options);
  this.cacheKeyPrefix = options.cacheKeyPrefix || JSON_STORE_CACHE_KEY_PREFIX;
  this.localStorage = options.localStorage;
  // 'do' about attributes
  this.patches = [];
  this.relativePatches = [];
  this.backPatches = [];
  this.currentPath = [];
  this.isDoing = false;
}

JSONDataStore.prototype = {
  _getCacheKeysMap: function _getCacheKeysMap(options) {
    var cacheKeysMap = {};
    if (utils.type(options.cacheKeys) === 'array') {
      options.cacheKeys.forEach(function (key) {
        if (Object.hasOwnProperty.call(options.store, key)) {
          cacheKeysMap[key] = true;
        }
      });
    }
    return cacheKeysMap;
  },
  _getRef: function _getRef(path) {
    var ref = this.store,
        i = 0,
        len = path.length;
    for (; i < len; i++) {
      ref = ref[path[i]];
    }
    return ref;
  },
  _detectPath: function _detectPath(path) {
    var detected = [],
        ref = this.store,
        i = 0,
        len = path.length,
        key,
        keyType,
        refType;
    for (; i < len; i++) {
      key = path[i];
      keyType = utils.type(key);
      refType = utils.type(ref);
      if (refType === 'object') {
        if (object.hasOwnProperty.call(key, '__value')) {
          var objKey = object.getObjectKeyByValue(ref, key.__value);
          if (objKey) {
            ref = ref[objKey];
            detected.push(objKey);
          } else {
            return [];
          }
        } else if (object.hasOwnProperty.call(ref, key)) {
          ref = ref[key];
          detected.push(key);
        } else {
          return [];
        }
      } else if (refType === 'array') {
        if (object.hasOwnProperty.call(key, '__value')) {
          var index = array.getArrayIndexByValue(ref, key.__value);
          if (index > -1) {
            ref = ref[index];
            detected.push(index);
          } else {
            return [];
          }
        } else if (object.hasOwnProperty.call(ref, key)) {
          ref = ref[key];
          detected.push(key);
        } else {
          return [];
        }
      }
    }
    return detected;
  },
  _formatPath: function _formatPath(path, detect) {
    var pathType = utils.type(path);
    if (pathType === 'undefined' || pathType === 'null') {
      path = [];
    } else if (pathType !== 'array') {
      path = [path];
    }
    if (detect !== false) {
      var detected = this._detectPath(path);
      if (detected.length === path.length) {
        return detected;
      }
      return null;
    }
    return path;
  },
  _moveArrayItem: function _moveArrayItem(path, moveUp) {
    var fullPath = this._getFullPath(path);
    if (!fullPath || fullPath.length < 1) return this;
    var itemIndex = fullPath.pop(),
        arr = this._getRef(fullPath);
    if (utils.type(arr) !== 'array') return this;
    var method = moveUp === true ? 'createMoveUp' : 'createMoveDown',
        reverseMethod = method === 'createMoveUp' ? 'createMoveDown' : 'createMoveUp';
    if (this.isDoing) {
      this.patches.push(patchMethods[method](fullPath.concat(itemIndex)));
      this.relativePatches.push(patchMethods[method](this._getRelativePath(fullPath.concat(itemIndex))));
      if (moveUp === true && itemIndex > 0 || moveUp !== true && itemIndex < arr.length - 1) {
        this.backPatches.unshift(patchMethods[reverseMethod](fullPath.concat(moveUp === true ? itemIndex - 1 : itemIndex + 1)));
      }
    }
    if (moveUp === true) {
      array.moveArrayItemUp(arr, itemIndex);
    } else {
      array.moveArrayItemDown(arr, itemIndex);
    }
    this._updateCache(path[0]);
    return this;
  },
  _getFullPath: function _getFullPath(path) {
    if (utils.isReferenceType(path) && path.isFull) {
      return path;
    }
    var currentPath = this._formatPath(this.currentPath, false),
        fullPath = currentPath.concat(this._formatPath(path, false)),
        formattedFullPath = this._formatPath(fullPath);
    if (formattedFullPath) {
      formattedFullPath.isFull = true;
    }
    return formattedFullPath;
  },
  _getRelativePath: function _getRelativePath(fullPath) {
    return fullPath.slice(this.currentPath.length);
  },
  _composeCacheKey: function _composeCacheKey(key) {
    return this.cacheKeyPrefix + '@' + key;
  },
  _updateCache: function _updateCache(key) {
    if (this.cacheKeys[key] && this.localStorage && typeof this.localStorage.setItem === 'function') {
      this.localStorage.setItem(this._composeCacheKey(key), this.get(key));
    }
  },
  loadCache: function loadCache(success, error) {
    var _this = this;

    error = typeof error === 'function' ? error : emptyFunc;
    if (this.localStorage && typeof this.localStorage.multiGet === 'function') {
      (function () {
        var cacheKeys = _this.initialOptions.cacheKeys || [];
        var composedKeys = cacheKeys.map(function (key) {
          return _this._composeCacheKey(key);
        });
        _this.localStorage.multiGet(composedKeys, function (cache) {
          var parsedCache = {};
          composedKeys.forEach(function (composedKey, index) {
            var key = cacheKeys[index];
            var cachedValue = cache[composedKey];
            _this.set(key, cachedValue === null ? _this.get(key) : cachedValue);
            parsedCache[key] = cache[composedKey];
          });
          success(parsedCache);
        }, error);
      })();
    } else {
      error('localStorage is undefined');
    }
  },
  reInit: function reInit(options) {
    JSONDataStore.call(this, options || this.initialOptions);
    return this;
  },
  goTo: function goTo(path, addUp) {
    if (!this.isDoing) {
      throw new Error('You are using store.goTo outside store.do!');
    }
    if (addUp === true) {
      this.currentPath = this._getFullPath(path);
    } else {
      this.currentPath = this._formatPath(path);
    }
    return this;
  },
  do: function _do(name, action, a, b, c, d, e, f) {
    var result = {};
    this.isDoing = true;
    if (typeof name === 'function') {
      name(this, action, a, b, c, d, e, f);
    } else if (typeof action === 'function') {
      action(this, a, b, c, d, e, f);
    } else {
      throw new Error('Invalid parameter action.');
    }
    // compose result
    result.patches = this.patches;
    result.relativePatches = this.relativePatches;
    result.backPatches = this.backPatches;
    // reset 'do' about attributes
    this.patches = [];
    this.relativePatches = [];
    this.backPatches = [];
    this.currentPath = [];
    this.isDoing = false;
    return result;
  },
  add: function add(path, value, key) {
    var ref, refType;
    path = this._getFullPath(path);
    if (!path || !utils.isReferenceType(ref = this._getRef(path)) || (refType = utils.type(ref)) === 'object' && !utils.isCommonKeyType(key)) {
      return this;
    }
    if (this.isDoing) {
      this.patches.push(patchMethods.createAdd(path, value, key));
      this.relativePatches.push(patchMethods.createAdd(this._getRelativePath(path), value, key));
      if (refType === 'object') {
        this.backPatches.unshift(patchMethods.createRemove(path.concat(key)));
      } else {
        this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path), true));
      }
    }
    if (refType === 'object') {
      ref[key] = value;
    } else {
      var index = array.parseArrayIndex(key);
      if (index !== undefined) {
        ref.splice(index, 0, value);
      } else {
        ref.push(value);
      }
    }
    this._updateCache(path[0]);
    return this;
  },
  remove: function remove(path) {
    if (!(path = this._getFullPath(path))) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createRemove(path));
      this.relativePatches.push(patchMethods.createRemove(this._getRelativePath(path)));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path), true));
    }
    if (path.length < 1) {
      this.store = undefined;
      return this;
    }
    var lastKey = path.pop(),
        ref = this._getRef(path),
        refType = utils.type(ref);
    if (refType === 'array') {
      ref.splice(lastKey, 1);
    } else if (refType === 'object') {
      delete ref[lastKey];
    }
    this._updateCache(path[0]);
    return this;
  },
  update: function update(path, value, forceUpdate) {
    path = this._formatPath(path, false);
    var lastKey,
        fullPath = this._getFullPath(path);
    if (fullPath) {
      if (this.isDoing) {
        this.patches.push(patchMethods.createUpdate(fullPath, value));
        this.relativePatches.push(patchMethods.createUpdate(this._getRelativePath(fullPath), value));
        this.backPatches.unshift(patchMethods.createUpdate(fullPath, this.get(fullPath)));
      }
      lastKey = fullPath.pop();
      if (lastKey !== undefined) {
        this._getRef(fullPath)[lastKey] = value;
      } else {
        this.store = value;
      }
      this._updateCache(path[0]);
      return this;
    } else if (forceUpdate === true && path.length > 0) {
      lastKey = path.pop();
      return this.add(path, value, lastKey);
    }
    return this;
  },
  set: function set(path, value) {
    return this.update(path, value, true);
  },
  moveUp: function moveUp(path) {
    return this._moveArrayItem(path, true);
  },
  moveDown: function moveDown(path) {
    return this._moveArrayItem(path);
  },
  moveTo: function moveTo(from, to, key) {
    from = this._getFullPath(from);
    to = this._getFullPath(to);
    if (!from || !to || !utils.isReferenceType(this._getRef(to))) return this;
    this.add(to, this._getRef(from), key);
    this.remove(from);
    return this;
  },
  exchange: function exchange(from, to) {
    from = this._getFullPath(from);
    to = this._getFullPath(to);
    if (from && to) {
      var fromRef = this._getRef(from),
          toRef = this.get(to);
      this.update(from, toRef);
      this.update(to, fromRef);
    }
    return this;
  },
  extendObject: function extendObject(path, a, b, c, d, e, f) {
    var ref;
    if (!(path = this._getFullPath(path)) || utils.type(ref = this._getRef(path)) !== 'object') return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createExtendObject.apply(this, arguments));
      this.relativePatches.push(patchMethods.createExtendObject(this._getRelativePath(path), a, b, c, d, e, f));
      this.backPatches.push(patchMethods.createUpdate(path, this.get(path)));
    }
    object.extend(ref, a, b, c, d, e, f);
    this._updateCache(path[0]);
    return this;
  },
  spreadArray: function spreadArray(path, begin, infilling, simpleInfilling, count) {
    var ref;
    if (!(path = this._getFullPath(path)) || utils.type(ref = this._getRef(path)) !== 'array') {
      return this;
    }
    begin = typeof begin === 'number' ? begin : ref.length;
    if (!(utils.type(begin) === 'number')) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpreadArray(path, begin, infilling, simpleInfilling, count));
      this.relativePatches.push(patchMethods.createSpreadArray(this._getRelativePath(path), begin, infilling, simpleInfilling, count));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spreadArray(ref, begin, infilling, simpleInfilling, count);
    this._updateCache(path[0]);
    return this;
  },
  spread2dArrayRow: function spread2dArrayRow(path, begin, rows, simpleInfilling, count) {
    var ref;
    if (!(path = this._getFullPath(path)) || !array.is2dArray(ref = this._getRef(path)) || !(utils.type(begin) === 'number')) {
      return this;
    }
    begin = typeof begin === 'number' ? begin : ref.length;
    if (!(utils.type(begin) === 'number')) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpread2dArrayRow(path, begin, rows, simpleInfilling, count));
      this.relativePatches.push(patchMethods.createSpread2dArrayRow(this._getRelativePath(path), begin, rows, simpleInfilling, count));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayRow(ref, begin, rows, simpleInfilling, count);
    this._updateCache(path[0]);
    return this;
  },
  spread2dArrayCol: function spread2dArrayCol(path, begin, cols, simpleInfilling, count) {
    var ref;
    if (!(path = this._getFullPath(path)) || !array.is2dArray(ref = this._getRef(path)) || !(utils.type(begin) === 'number')) {
      return this;
    }
    begin = typeof begin === 'number' ? begin : ref[0].length;
    if (!(utils.type(begin) === 'number')) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpread2dArrayCol(path, begin, cols, simpleInfilling, count));
      this.relativePatches.push(patchMethods.createSpread2dArrayCol(this._getRelativePath(path), begin, cols, simpleInfilling, count));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayCol(ref, begin, cols, simpleInfilling, count);
    this._updateCache(path[0]);
    return this;
  },
  get: function get(path, copy) {
    if (path = this._getFullPath(path)) {
      return copy === false ? this._getRef(path) : utils.copy(this._getRef(path));
    }
  },
  patch: function patch() {
    throw new Error('This method is deprecated, use JSONStore.patch instead.');
  },
  applyPatch: function applyPatch(patches) {
    patches = utils.type(patches) === 'array' ? patches : [patches];
    patches.forEach(function (patch) {
      this[patch.type].apply(this, patch.args);
    }.bind(this));
    return this;
  }
};

JSONDataStore.Patch = patchMethods;

module.exports = JSONDataStore;
},{"./array":2,"./object":3,"./patch":4,"./utils":5}],2:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');

var splice = Array.prototype.splice;

var createArray = function createArray(length, infilling) {
  length = length || 0;
  var arr = [],
      i = 0;
  for (; i < length; i++) {
    arr.push(infilling === undefined ? null : utils.copy(infilling));
  }
  return arr;
};

var is2dArray = function is2dArray(arr) {
  var is2d;
  if (is2d = utils.type(arr) === 'array' && arr.length > 0) {
    var i = 0,
        len = arr.length;
    for (; i < len; i++) {
      is2d &= utils.type(arr[i]) === 'array';
      if (!is2d) return false;
    }
    return true;
  }
  return false;
};

var create2dArray = function create2dArray(row, col, infilling) {
  row = row || 0;
  col = col || 0;
  var arr = new Array(row),
      i = 0;
  for (; i < row; i++) {
    arr[i] = createArray(col, infilling);
  }
  return arr;
};

var parseArrayIndex = function parseArrayIndex(index) {
  var type = utils.type(index);
  if (type === 'string' || type === 'number') {
    return parseInt(index);
  }
  return void 0;
};

var getArrayIndexByValue = function getArrayIndexByValue(arr, value) {
  if (utils.type(arr) === 'array') {
    var valueType = utils.type(value);
    if (valueType === 'object') {
      var i = 0,
          len = arr.length,
          item;
      for (; i < len; i++) {
        item = arr[i];
        var isEqual = false;
        for (var key in value) {
          if (value.hasOwnProperty(key)) {
            isEqual = item[key] === value[key];
            if (!isEqual) break;
          }
        }
        if (isEqual) {
          return i;
        }
      }
      return -1;
    } else {
      return arr.indexOf(value);
    }
  }
};

var moveArrayItemUp = function moveArrayItemUp(arr, index) {
  if (utils.type(arr) === 'array') {
    index = parseArrayIndex(index);
    var currItem = arr[index];
    if (index > 0) {
      arr[index] = arr[index - 1];
      arr[index - 1] = currItem;
    }
  }
};

var moveArrayItemDown = function moveArrayItemDown(arr, index) {
  if (utils.type(arr) === 'array') {
    index = parseArrayIndex(index);
    var currItem = arr[index];
    if (index < arr.length - 1) {
      arr[index] = arr[index + 1];
      arr[index + 1] = currItem;
    }
  }
};

var spreadArray = function spreadArray(arr, begin, infilling, simpleInfilling, count) {
  var deleted = [];
  if (utils.type(arr) === 'array') {
    var infillingType = utils.type(infilling);
    if (simpleInfilling === true) {
      splice.apply(arr, [begin, 0].concat(createArray(parseInt(count) || 1, infilling)));
    } else if (infillingType === 'array') {
      splice.apply(arr, [begin, 0].concat(infilling));
    } else if (infillingType === 'number') {
      if (infilling > 0) {
        splice.apply(arr, [begin, 0].concat(createArray(infilling)));
      } else if (infilling < 0) {
        deleted = splice.apply(arr, [begin, Math.abs(infilling)]);
      }
    }
  }
  return deleted;
};

var spread2dArrayRow = function spread2dArrayRow(arr, begin, rows, simpleInfilling, count) {
  var deleted = [],
      rowsType = utils.type(rows);
  if (is2dArray(arr)) {
    var colCount = arr[0].length;
    if (simpleInfilling === true) {
      spreadArray(arr, begin, createArray(colCount, rows), true, count);
    } else if (rowsType === 'number') {
      if (rows > 0) {
        spreadArray(arr, begin, create2dArray(rows, colCount));
      } else if (rows < 0) {
        deleted = spreadArray(arr, begin, rows);
      }
    } else if (rowsType === 'array') {
      spreadArray(arr, begin, rows);
    }
  }
  return deleted;
};

var spread2dArrayCol = function spread2dArrayCol(arr, begin, cols, simpleInfilling, count) {
  var deleted = [],
      deletedCol,
      colsType = utils.type(cols);
  if (is2dArray(arr)) {
    var rowCount = arr.length,
        i = 0;
    if (simpleInfilling === true) {
      for (; i < rowCount; i++) {
        spreadArray(arr[i], begin, cols, true, count);
      }
    } else if (colsType === 'number') {
      for (; i < rowCount; i++) {
        deletedCol = spreadArray(arr[i], begin, cols);
        if (deletedCol.length) {
          deleted.push(deletedCol);
        }
      }
    } else if (colsType === 'array') {
      for (; i < rowCount; i++) {
        spreadArray(arr[i], begin, cols[i]);
      }
    }
  }
  return deleted;
};

module.exports = {
  is2dArray: is2dArray,
  createArray: createArray,
  create2dArray: create2dArray,
  parseArrayIndex: parseArrayIndex,
  getArrayIndexByValue: getArrayIndexByValue,
  moveArrayItemUp: moveArrayItemUp,
  moveArrayItemDown: moveArrayItemDown,
  spreadArray: spreadArray,
  spread2dArrayRow: spread2dArrayRow,
  spread2dArrayCol: spread2dArrayCol
};
},{"./utils":5}],3:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');

var getObjectKeyByValue = function getObjectKeyByValue(obj, value) {
  var objKey, objValue, valueKey;
  if (utils.type(value) === 'object') {
    outer: for (objKey in obj) {
      if (obj.hasOwnProperty(objKey) && utils.type(objValue = obj[objKey]) === 'object') {
        for (valueKey in value) {
          if (value.hasOwnProperty(valueKey) && value[valueKey] !== objValue[valueKey]) {
            continue outer;
          }
        }
        return objKey;
      }
    }
  } else {
    for (objKey in obj) {
      if (obj.hasOwnProperty(objKey) && obj[objKey] === value) {
        return objKey;
      }
    }
  }
  return undefined;
};

var extend = function extend() {
  var target = arguments[0],
      argLen = arguments.length;
  for (var i = 1; i < argLen; i++) {
    var source = arguments[i],
        key;
    if (utils.type(source) === 'object') {
      for (key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = utils.copy(source[key]);
        }
      }
    }
  }
  return target;
};

module.exports = {
  hasOwnProperty: Object.prototype.hasOwnProperty,
  extend: extend,
  getObjectKeyByValue: getObjectKeyByValue
};
},{"./utils":5}],4:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');

var patchTypes = {
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

var createPatch = function createPatch(type, args) {
  args = Array.prototype.slice.call(args);
  return utils.copy({
    type: type,
    args: args
  });
};

/**
 * create patch operations
 * */

var patchMethods = {
  createAdd: function createAdd(path, value, key) {
    return createPatch(patchTypes.add, arguments);
  },
  createRemove: function createRemove(path) {
    return createPatch(patchTypes.remove, arguments);
  },
  createUpdate: function createUpdate(path, value, forceUpdate) {
    return createPatch(patchTypes.update, arguments);
  },
  createSet: function createSet(path, value) {
    return createPatch(patchTypes.set, arguments);
  },
  createMoveUp: function createMoveUp(path) {
    return createPatch(patchTypes.moveUp, arguments);
  },
  createMoveDown: function createMoveDown(path) {
    return createPatch(patchTypes.moveDown, arguments);
  },
  createMoveTo: function createMoveTo(from, to, key) {
    return createPatch(patchTypes.moveTo, arguments);
  },
  createExchange: function createExchange(from, to) {
    return createPatch(patchTypes.exchange, arguments);
  },
  createExtendObject: function createExtendObject(path, a, b, c, d, e) {
    return createPatch(patchTypes.extendObject, arguments);
  },
  createSpreadArray: function createSpreadArray(path, begin, infilling, simpleInfilling, count) {
    return createPatch(patchTypes.spreadArray, arguments);
  },
  createSpread2dArrayRow: function createSpread2dArrayRow(path, begin, rows, simpleInfilling, count) {
    return createPatch(patchTypes.spread2dArrayRow, arguments);
  },
  createSpread2dArrayCol: function createSpread2dArrayCol(path, begin, cols, simpleInfilling, count) {
    return createPatch(patchTypes.spread2dArrayCol, arguments);
  }
};

module.exports = patchMethods;
},{"./utils":5}],5:[function(_dereq_,module,exports){
'use strict';

var referenceTypes = {
  'array': true,
  'object': true
};

var commonKeyTypes = {
  'string': true,
  'number': true
};

var type = function type(data) {
  return Object.prototype.toString.call(data).slice(8, -1).toLowerCase();
};

var isReferenceType = function isReferenceType(data) {
  return referenceTypes[type(data)] || false;
};

var isCommonKeyType = function isCommonKeyType(key) {
  return commonKeyTypes[type(key)] || false;
};

var copy = function copy(data) {
  return isReferenceType(data) ? JSON.parse(JSON.stringify(data)) : data;
};

module.exports = {
  type: type,
  copy: copy,
  isReferenceType: isReferenceType,
  isCommonKeyType: isCommonKeyType
};
},{}],6:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./lib/JSONDataStore');
},{"./lib/JSONDataStore":1}]},{},[6])(6)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy8uNi4wLjFAYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvSlNPTkRhdGFTdG9yZS5qcyIsImJ1aWxkL21vZHVsZXMvbGliL2FycmF5LmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvb2JqZWN0LmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvcGF0Y2guanMiLCJidWlsZC9tb2R1bGVzL2xpYi91dGlscy5qcyIsImJ1aWxkL21vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogb3B0aW9uczpcbiAqICBzdG9yZVxuICogIGNvcHlTdG9yZVxuICogIGNhY2hlS2V5c1xuICogIGxvY2FsU3RvcmFnZVxuICogKiovXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcbnZhciBvYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xudmFyIHBhdGNoTWV0aG9kcyA9IHJlcXVpcmUoJy4vcGF0Y2gnKTtcbnZhciBKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVggPSAnSlNPTl9TVE9SRV9DQUNIRV9LRVlfUFJFRklYJztcbnZhciBlbXB0eUZ1bmMgPSBmdW5jdGlvbiBlbXB0eUZ1bmMoKSB7fTtcblxuZnVuY3Rpb24gSlNPTkRhdGFTdG9yZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLmluaXRpYWxPcHRpb25zID0gdXRpbHMuY29weShvcHRpb25zKTtcbiAgdmFyIHN0b3JlID0gb3B0aW9ucy5zdG9yZSxcbiAgICAgIGNvcHlTdG9yZSA9IG9wdGlvbnMuY29weVN0b3JlICE9PSBmYWxzZTtcbiAgdGhpcy5zdG9yZSA9IGNvcHlTdG9yZSA/IHV0aWxzLmNvcHkoc3RvcmUpIDogc3RvcmU7XG4gIHRoaXMuY2FjaGVLZXlzID0gdGhpcy5fZ2V0Q2FjaGVLZXlzTWFwKG9wdGlvbnMpO1xuICB0aGlzLmNhY2hlS2V5UHJlZml4ID0gb3B0aW9ucy5jYWNoZUtleVByZWZpeCB8fCBKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVg7XG4gIHRoaXMubG9jYWxTdG9yYWdlID0gb3B0aW9ucy5sb2NhbFN0b3JhZ2U7XG4gIC8vICdkbycgYWJvdXQgYXR0cmlidXRlc1xuICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMgPSBbXTtcbiAgdGhpcy5iYWNrUGF0Y2hlcyA9IFtdO1xuICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gIHRoaXMuaXNEb2luZyA9IGZhbHNlO1xufVxuXG5KU09ORGF0YVN0b3JlLnByb3RvdHlwZSA9IHtcbiAgX2dldENhY2hlS2V5c01hcDogZnVuY3Rpb24gX2dldENhY2hlS2V5c01hcChvcHRpb25zKSB7XG4gICAgdmFyIGNhY2hlS2V5c01hcCA9IHt9O1xuICAgIGlmICh1dGlscy50eXBlKG9wdGlvbnMuY2FjaGVLZXlzKSA9PT0gJ2FycmF5Jykge1xuICAgICAgb3B0aW9ucy5jYWNoZUtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLnN0b3JlLCBrZXkpKSB7XG4gICAgICAgICAgY2FjaGVLZXlzTWFwW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlS2V5c01hcDtcbiAgfSxcbiAgX2dldFJlZjogZnVuY3Rpb24gX2dldFJlZihwYXRoKSB7XG4gICAgdmFyIHJlZiA9IHRoaXMuc3RvcmUsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICByZWYgPSByZWZbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiByZWY7XG4gIH0sXG4gIF9kZXRlY3RQYXRoOiBmdW5jdGlvbiBfZGV0ZWN0UGF0aChwYXRoKSB7XG4gICAgdmFyIGRldGVjdGVkID0gW10sXG4gICAgICAgIHJlZiA9IHRoaXMuc3RvcmUsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aCxcbiAgICAgICAga2V5LFxuICAgICAgICBrZXlUeXBlLFxuICAgICAgICByZWZUeXBlO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGtleSA9IHBhdGhbaV07XG4gICAgICBrZXlUeXBlID0gdXRpbHMudHlwZShrZXkpO1xuICAgICAgcmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKTtcbiAgICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoa2V5LCAnX192YWx1ZScpKSB7XG4gICAgICAgICAgdmFyIG9iaktleSA9IG9iamVjdC5nZXRPYmplY3RLZXlCeVZhbHVlKHJlZiwga2V5Ll9fdmFsdWUpO1xuICAgICAgICAgIGlmIChvYmpLZXkpIHtcbiAgICAgICAgICAgIHJlZiA9IHJlZltvYmpLZXldO1xuICAgICAgICAgICAgZGV0ZWN0ZWQucHVzaChvYmpLZXkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlZiwga2V5KSkge1xuICAgICAgICAgIHJlZiA9IHJlZltrZXldO1xuICAgICAgICAgIGRldGVjdGVkLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVmVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoa2V5LCAnX192YWx1ZScpKSB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuZ2V0QXJyYXlJbmRleEJ5VmFsdWUocmVmLCBrZXkuX192YWx1ZSk7XG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgIHJlZiA9IHJlZltpbmRleF07XG4gICAgICAgICAgICBkZXRlY3RlZC5wdXNoKGluZGV4KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChyZWYsIGtleSkpIHtcbiAgICAgICAgICByZWYgPSByZWZba2V5XTtcbiAgICAgICAgICBkZXRlY3RlZC5wdXNoKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXRlY3RlZDtcbiAgfSxcbiAgX2Zvcm1hdFBhdGg6IGZ1bmN0aW9uIF9mb3JtYXRQYXRoKHBhdGgsIGRldGVjdCkge1xuICAgIHZhciBwYXRoVHlwZSA9IHV0aWxzLnR5cGUocGF0aCk7XG4gICAgaWYgKHBhdGhUeXBlID09PSAndW5kZWZpbmVkJyB8fCBwYXRoVHlwZSA9PT0gJ251bGwnKSB7XG4gICAgICBwYXRoID0gW107XG4gICAgfSBlbHNlIGlmIChwYXRoVHlwZSAhPT0gJ2FycmF5Jykge1xuICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICB9XG4gICAgaWYgKGRldGVjdCAhPT0gZmFsc2UpIHtcbiAgICAgIHZhciBkZXRlY3RlZCA9IHRoaXMuX2RldGVjdFBhdGgocGF0aCk7XG4gICAgICBpZiAoZGV0ZWN0ZWQubGVuZ3RoID09PSBwYXRoLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZGV0ZWN0ZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH0sXG4gIF9tb3ZlQXJyYXlJdGVtOiBmdW5jdGlvbiBfbW92ZUFycmF5SXRlbShwYXRoLCBtb3ZlVXApIHtcbiAgICB2YXIgZnVsbFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICBpZiAoIWZ1bGxQYXRoIHx8IGZ1bGxQYXRoLmxlbmd0aCA8IDEpIHJldHVybiB0aGlzO1xuICAgIHZhciBpdGVtSW5kZXggPSBmdWxsUGF0aC5wb3AoKSxcbiAgICAgICAgYXJyID0gdGhpcy5fZ2V0UmVmKGZ1bGxQYXRoKTtcbiAgICBpZiAodXRpbHMudHlwZShhcnIpICE9PSAnYXJyYXknKSByZXR1cm4gdGhpcztcbiAgICB2YXIgbWV0aG9kID0gbW92ZVVwID09PSB0cnVlID8gJ2NyZWF0ZU1vdmVVcCcgOiAnY3JlYXRlTW92ZURvd24nLFxuICAgICAgICByZXZlcnNlTWV0aG9kID0gbWV0aG9kID09PSAnY3JlYXRlTW92ZVVwJyA/ICdjcmVhdGVNb3ZlRG93bicgOiAnY3JlYXRlTW92ZVVwJztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHNbbWV0aG9kXShmdWxsUGF0aC5jb25jYXQoaXRlbUluZGV4KSkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHNbbWV0aG9kXSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgoZnVsbFBhdGguY29uY2F0KGl0ZW1JbmRleCkpKSk7XG4gICAgICBpZiAobW92ZVVwID09PSB0cnVlICYmIGl0ZW1JbmRleCA+IDAgfHwgbW92ZVVwICE9PSB0cnVlICYmIGl0ZW1JbmRleCA8IGFyci5sZW5ndGggLSAxKSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHNbcmV2ZXJzZU1ldGhvZF0oZnVsbFBhdGguY29uY2F0KG1vdmVVcCA9PT0gdHJ1ZSA/IGl0ZW1JbmRleCAtIDEgOiBpdGVtSW5kZXggKyAxKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobW92ZVVwID09PSB0cnVlKSB7XG4gICAgICBhcnJheS5tb3ZlQXJyYXlJdGVtVXAoYXJyLCBpdGVtSW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcnJheS5tb3ZlQXJyYXlJdGVtRG93bihhcnIsIGl0ZW1JbmRleCk7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZUNhY2hlKHBhdGhbMF0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBfZ2V0RnVsbFBhdGg6IGZ1bmN0aW9uIF9nZXRGdWxsUGF0aChwYXRoKSB7XG4gICAgaWYgKHV0aWxzLmlzUmVmZXJlbmNlVHlwZShwYXRoKSAmJiBwYXRoLmlzRnVsbCkge1xuICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxuICAgIHZhciBjdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodGhpcy5jdXJyZW50UGF0aCwgZmFsc2UpLFxuICAgICAgICBmdWxsUGF0aCA9IGN1cnJlbnRQYXRoLmNvbmNhdCh0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKSksXG4gICAgICAgIGZvcm1hdHRlZEZ1bGxQYXRoID0gdGhpcy5fZm9ybWF0UGF0aChmdWxsUGF0aCk7XG4gICAgaWYgKGZvcm1hdHRlZEZ1bGxQYXRoKSB7XG4gICAgICBmb3JtYXR0ZWRGdWxsUGF0aC5pc0Z1bGwgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVkRnVsbFBhdGg7XG4gIH0sXG4gIF9nZXRSZWxhdGl2ZVBhdGg6IGZ1bmN0aW9uIF9nZXRSZWxhdGl2ZVBhdGgoZnVsbFBhdGgpIHtcbiAgICByZXR1cm4gZnVsbFBhdGguc2xpY2UodGhpcy5jdXJyZW50UGF0aC5sZW5ndGgpO1xuICB9LFxuICBfY29tcG9zZUNhY2hlS2V5OiBmdW5jdGlvbiBfY29tcG9zZUNhY2hlS2V5KGtleSkge1xuICAgIHJldHVybiB0aGlzLmNhY2hlS2V5UHJlZml4ICsgJ0AnICsga2V5O1xuICB9LFxuICBfdXBkYXRlQ2FjaGU6IGZ1bmN0aW9uIF91cGRhdGVDYWNoZShrZXkpIHtcbiAgICBpZiAodGhpcy5jYWNoZUtleXNba2V5XSAmJiB0aGlzLmxvY2FsU3RvcmFnZSAmJiB0eXBlb2YgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0aGlzLl9jb21wb3NlQ2FjaGVLZXkoa2V5KSwgdGhpcy5nZXQoa2V5KSk7XG4gICAgfVxuICB9LFxuICBsb2FkQ2FjaGU6IGZ1bmN0aW9uIGxvYWRDYWNoZShzdWNjZXNzLCBlcnJvcikge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBlcnJvciA9IHR5cGVvZiBlcnJvciA9PT0gJ2Z1bmN0aW9uJyA/IGVycm9yIDogZW1wdHlGdW5jO1xuICAgIGlmICh0aGlzLmxvY2FsU3RvcmFnZSAmJiB0eXBlb2YgdGhpcy5sb2NhbFN0b3JhZ2UubXVsdGlHZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYWNoZUtleXMgPSBfdGhpcy5pbml0aWFsT3B0aW9ucy5jYWNoZUtleXMgfHwgW107XG4gICAgICAgIHZhciBjb21wb3NlZEtleXMgPSBjYWNoZUtleXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXMuX2NvbXBvc2VDYWNoZUtleShrZXkpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3RoaXMubG9jYWxTdG9yYWdlLm11bHRpR2V0KGNvbXBvc2VkS2V5cywgZnVuY3Rpb24gKGNhY2hlKSB7XG4gICAgICAgICAgdmFyIHBhcnNlZENhY2hlID0ge307XG4gICAgICAgICAgY29tcG9zZWRLZXlzLmZvckVhY2goZnVuY3Rpb24gKGNvbXBvc2VkS2V5LCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGNhY2hlS2V5c1tpbmRleF07XG4gICAgICAgICAgICB2YXIgY2FjaGVkVmFsdWUgPSBjYWNoZVtjb21wb3NlZEtleV07XG4gICAgICAgICAgICBfdGhpcy5zZXQoa2V5LCBjYWNoZWRWYWx1ZSA9PT0gbnVsbCA/IF90aGlzLmdldChrZXkpIDogY2FjaGVkVmFsdWUpO1xuICAgICAgICAgICAgcGFyc2VkQ2FjaGVba2V5XSA9IGNhY2hlW2NvbXBvc2VkS2V5XTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzdWNjZXNzKHBhcnNlZENhY2hlKTtcbiAgICAgICAgfSwgZXJyb3IpO1xuICAgICAgfSkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3IoJ2xvY2FsU3RvcmFnZSBpcyB1bmRlZmluZWQnKTtcbiAgICB9XG4gIH0sXG4gIHJlSW5pdDogZnVuY3Rpb24gcmVJbml0KG9wdGlvbnMpIHtcbiAgICBKU09ORGF0YVN0b3JlLmNhbGwodGhpcywgb3B0aW9ucyB8fCB0aGlzLmluaXRpYWxPcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZ29UbzogZnVuY3Rpb24gZ29UbyhwYXRoLCBhZGRVcCkge1xuICAgIGlmICghdGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgdXNpbmcgc3RvcmUuZ29UbyBvdXRzaWRlIHN0b3JlLmRvIScpO1xuICAgIH1cbiAgICBpZiAoYWRkVXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkbzogZnVuY3Rpb24gX2RvKG5hbWUsIGFjdGlvbiwgYSwgYiwgYywgZCwgZSwgZikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB0aGlzLmlzRG9pbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbmFtZSh0aGlzLCBhY3Rpb24sIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWN0aW9uKHRoaXMsIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcGFyYW1ldGVyIGFjdGlvbi4nKTtcbiAgICB9XG4gICAgLy8gY29tcG9zZSByZXN1bHRcbiAgICByZXN1bHQucGF0Y2hlcyA9IHRoaXMucGF0Y2hlcztcbiAgICByZXN1bHQucmVsYXRpdmVQYXRjaGVzID0gdGhpcy5yZWxhdGl2ZVBhdGNoZXM7XG4gICAgcmVzdWx0LmJhY2tQYXRjaGVzID0gdGhpcy5iYWNrUGF0Y2hlcztcbiAgICAvLyByZXNldCAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gICAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgYWRkOiBmdW5jdGlvbiBhZGQocGF0aCwgdmFsdWUsIGtleSkge1xuICAgIHZhciByZWYsIHJlZlR5cGU7XG4gICAgcGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghcGF0aCB8fCAhdXRpbHMuaXNSZWZlcmVuY2VUeXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgKHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZikpID09PSAnb2JqZWN0JyAmJiAhdXRpbHMuaXNDb21tb25LZXlUeXBlKGtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUFkZCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIHZhbHVlLCBrZXkpKTtcbiAgICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoLmNvbmNhdChrZXkpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlZltrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5LnBhcnNlQXJyYXlJbmRleChrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmLnNwbGljZShpbmRleCwgMCwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVmLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl91cGRhdGVDYWNoZShwYXRoWzBdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUocGF0aCkge1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUocGF0aCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCksIHRydWUpKTtcbiAgICB9XG4gICAgaWYgKHBhdGgubGVuZ3RoIDwgMSkge1xuICAgICAgdGhpcy5zdG9yZSA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbGFzdEtleSA9IHBhdGgucG9wKCksXG4gICAgICAgIHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSxcbiAgICAgICAgcmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKTtcbiAgICBpZiAocmVmVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgcmVmLnNwbGljZShsYXN0S2V5LCAxKTtcbiAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBkZWxldGUgcmVmW2xhc3RLZXldO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVDYWNoZShwYXRoWzBdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlKSB7XG4gICAgcGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciBsYXN0S2V5LFxuICAgICAgICBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmIChmdWxsUGF0aCkge1xuICAgICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB2YWx1ZSkpO1xuICAgICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUoZnVsbFBhdGgsIHRoaXMuZ2V0KGZ1bGxQYXRoKSkpO1xuICAgICAgfVxuICAgICAgbGFzdEtleSA9IGZ1bGxQYXRoLnBvcCgpO1xuICAgICAgaWYgKGxhc3RLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpW2xhc3RLZXldID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl91cGRhdGVDYWNoZShwYXRoWzBdKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSBpZiAoZm9yY2VVcGRhdGUgPT09IHRydWUgJiYgcGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBsYXN0S2V5ID0gcGF0aC5wb3AoKTtcbiAgICAgIHJldHVybiB0aGlzLmFkZChwYXRoLCB2YWx1ZSwgbGFzdEtleSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uIHNldChwYXRoLCB2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gIH0sXG4gIG1vdmVVcDogZnVuY3Rpb24gbW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoLCB0cnVlKTtcbiAgfSxcbiAgbW92ZURvd246IGZ1bmN0aW9uIG1vdmVEb3duKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoKTtcbiAgfSxcbiAgbW92ZVRvOiBmdW5jdGlvbiBtb3ZlVG8oZnJvbSwgdG8sIGtleSkge1xuICAgIGZyb20gPSB0aGlzLl9nZXRGdWxsUGF0aChmcm9tKTtcbiAgICB0byA9IHRoaXMuX2dldEZ1bGxQYXRoKHRvKTtcbiAgICBpZiAoIWZyb20gfHwgIXRvIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUodGhpcy5fZ2V0UmVmKHRvKSkpIHJldHVybiB0aGlzO1xuICAgIHRoaXMuYWRkKHRvLCB0aGlzLl9nZXRSZWYoZnJvbSksIGtleSk7XG4gICAgdGhpcy5yZW1vdmUoZnJvbSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGV4Y2hhbmdlOiBmdW5jdGlvbiBleGNoYW5nZShmcm9tLCB0bykge1xuICAgIGZyb20gPSB0aGlzLl9nZXRGdWxsUGF0aChmcm9tKTtcbiAgICB0byA9IHRoaXMuX2dldEZ1bGxQYXRoKHRvKTtcbiAgICBpZiAoZnJvbSAmJiB0bykge1xuICAgICAgdmFyIGZyb21SZWYgPSB0aGlzLl9nZXRSZWYoZnJvbSksXG4gICAgICAgICAgdG9SZWYgPSB0aGlzLmdldCh0byk7XG4gICAgICB0aGlzLnVwZGF0ZShmcm9tLCB0b1JlZik7XG4gICAgICB0aGlzLnVwZGF0ZSh0bywgZnJvbVJlZik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBleHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ29iamVjdCcpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBhLCBiLCBjLCBkLCBlLCBmKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBvYmplY3QuZXh0ZW5kKHJlZiwgYSwgYiwgYywgZCwgZSwgZik7XG4gICAgdGhpcy5fdXBkYXRlQ2FjaGUocGF0aFswXSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZEFycmF5OiBmdW5jdGlvbiBzcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ2FycmF5Jykge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gdHlwZW9mIGJlZ2luID09PSAnbnVtYmVyJyA/IGJlZ2luIDogcmVmLmxlbmd0aDtcbiAgICBpZiAoISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkQXJyYXkodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBhcnJheS5zcHJlYWRBcnJheShyZWYsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpO1xuICAgIHRoaXMuX3VwZGF0ZUNhY2hlKHBhdGhbMF0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8ICFhcnJheS5pczJkQXJyYXkocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAhKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHR5cGVvZiBiZWdpbiA9PT0gJ251bWJlcicgPyBiZWdpbiA6IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3codGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkMmRBcnJheVJvdyhyZWYsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KTtcbiAgICB0aGlzLl91cGRhdGVDYWNoZShwYXRoWzBdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSB0eXBlb2YgYmVnaW4gPT09ICdudW1iZXInID8gYmVnaW4gOiByZWZbMF0ubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlDb2wocmVmLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCk7XG4gICAgdGhpcy5fdXBkYXRlQ2FjaGUocGF0aFswXSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24gZ2V0KHBhdGgsIGNvcHkpIHtcbiAgICBpZiAocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB7XG4gICAgICByZXR1cm4gY29weSA9PT0gZmFsc2UgPyB0aGlzLl9nZXRSZWYocGF0aCkgOiB1dGlscy5jb3B5KHRoaXMuX2dldFJlZihwYXRoKSk7XG4gICAgfVxuICB9LFxuICBwYXRjaDogZnVuY3Rpb24gcGF0Y2goKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIG1ldGhvZCBpcyBkZXByZWNhdGVkLCB1c2UgSlNPTlN0b3JlLnBhdGNoIGluc3RlYWQuJyk7XG4gIH0sXG4gIGFwcGx5UGF0Y2g6IGZ1bmN0aW9uIGFwcGx5UGF0Y2gocGF0Y2hlcykge1xuICAgIHBhdGNoZXMgPSB1dGlscy50eXBlKHBhdGNoZXMpID09PSAnYXJyYXknID8gcGF0Y2hlcyA6IFtwYXRjaGVzXTtcbiAgICBwYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICB0aGlzW3BhdGNoLnR5cGVdLmFwcGx5KHRoaXMsIHBhdGNoLmFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbkpTT05EYXRhU3RvcmUuUGF0Y2ggPSBwYXRjaE1ldGhvZHM7XG5cbm1vZHVsZS5leHBvcnRzID0gSlNPTkRhdGFTdG9yZTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHNwbGljZSA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2U7XG5cbnZhciBjcmVhdGVBcnJheSA9IGZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCwgaW5maWxsaW5nKSB7XG4gIGxlbmd0aCA9IGxlbmd0aCB8fCAwO1xuICB2YXIgYXJyID0gW10sXG4gICAgICBpID0gMDtcbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGFyci5wdXNoKGluZmlsbGluZyA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHV0aWxzLmNvcHkoaW5maWxsaW5nKSk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBpczJkQXJyYXkgPSBmdW5jdGlvbiBpczJkQXJyYXkoYXJyKSB7XG4gIHZhciBpczJkO1xuICBpZiAoaXMyZCA9IHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5JyAmJiBhcnIubGVuZ3RoID4gMCkge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gYXJyLmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpczJkICY9IHV0aWxzLnR5cGUoYXJyW2ldKSA9PT0gJ2FycmF5JztcbiAgICAgIGlmICghaXMyZCkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY3JlYXRlMmRBcnJheSA9IGZ1bmN0aW9uIGNyZWF0ZTJkQXJyYXkocm93LCBjb2wsIGluZmlsbGluZykge1xuICByb3cgPSByb3cgfHwgMDtcbiAgY29sID0gY29sIHx8IDA7XG4gIHZhciBhcnIgPSBuZXcgQXJyYXkocm93KSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IHJvdzsgaSsrKSB7XG4gICAgYXJyW2ldID0gY3JlYXRlQXJyYXkoY29sLCBpbmZpbGxpbmcpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG52YXIgcGFyc2VBcnJheUluZGV4ID0gZnVuY3Rpb24gcGFyc2VBcnJheUluZGV4KGluZGV4KSB7XG4gIHZhciB0eXBlID0gdXRpbHMudHlwZShpbmRleCk7XG4gIGlmICh0eXBlID09PSAnc3RyaW5nJyB8fCB0eXBlID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBwYXJzZUludChpbmRleCk7XG4gIH1cbiAgcmV0dXJuIHZvaWQgMDtcbn07XG5cbnZhciBnZXRBcnJheUluZGV4QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldEFycmF5SW5kZXhCeVZhbHVlKGFyciwgdmFsdWUpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIHZhciB2YWx1ZVR5cGUgPSB1dGlscy50eXBlKHZhbHVlKTtcbiAgICBpZiAodmFsdWVUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgIGxlbiA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgaXRlbTtcbiAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGFycltpXTtcbiAgICAgICAgdmFyIGlzRXF1YWwgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlzRXF1YWwgPSBpdGVtW2tleV0gPT09IHZhbHVlW2tleV07XG4gICAgICAgICAgICBpZiAoIWlzRXF1YWwpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNFcXVhbCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBhcnIuaW5kZXhPZih2YWx1ZSk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgbW92ZUFycmF5SXRlbVVwID0gZnVuY3Rpb24gbW92ZUFycmF5SXRlbVVwKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgIGFycltpbmRleF0gPSBhcnJbaW5kZXggLSAxXTtcbiAgICAgIGFycltpbmRleCAtIDFdID0gY3Vyckl0ZW07XG4gICAgfVxuICB9XG59O1xuXG52YXIgbW92ZUFycmF5SXRlbURvd24gPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtRG93bihhcnIsIGluZGV4KSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICBpbmRleCA9IHBhcnNlQXJyYXlJbmRleChpbmRleCk7XG4gICAgdmFyIGN1cnJJdGVtID0gYXJyW2luZGV4XTtcbiAgICBpZiAoaW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCArIDFdO1xuICAgICAgYXJyW2luZGV4ICsgMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBzcHJlYWRBcnJheSA9IGZ1bmN0aW9uIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICB2YXIgZGVsZXRlZCA9IFtdO1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIGluZmlsbGluZ1R5cGUgPSB1dGlscy50eXBlKGluZmlsbGluZyk7XG4gICAgaWYgKHNpbXBsZUluZmlsbGluZyA9PT0gdHJ1ZSkge1xuICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoY3JlYXRlQXJyYXkocGFyc2VJbnQoY291bnQpIHx8IDEsIGluZmlsbGluZykpKTtcbiAgICB9IGVsc2UgaWYgKGluZmlsbGluZ1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGluZmlsbGluZykpO1xuICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGlmIChpbmZpbGxpbmcgPiAwKSB7XG4gICAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGNyZWF0ZUFycmF5KGluZmlsbGluZykpKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCBNYXRoLmFicyhpbmZpbGxpbmcpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlSb3cgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Um93KGFyciwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIHJvd3NUeXBlID0gdXRpbHMudHlwZShyb3dzKTtcbiAgaWYgKGlzMmRBcnJheShhcnIpKSB7XG4gICAgdmFyIGNvbENvdW50ID0gYXJyWzBdLmxlbmd0aDtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCBjcmVhdGVBcnJheShjb2xDb3VudCwgcm93cyksIHRydWUsIGNvdW50KTtcbiAgICB9IGVsc2UgaWYgKHJvd3NUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKHJvd3MgPiAwKSB7XG4gICAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGNyZWF0ZTJkQXJyYXkocm93cywgY29sQ291bnQpKTtcbiAgICAgIH0gZWxzZSBpZiAocm93cyA8IDApIHtcbiAgICAgICAgZGVsZXRlZCA9IHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIHJvd3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocm93c1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIHJvd3MpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbnZhciBzcHJlYWQyZEFycmF5Q29sID0gZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChhcnIsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gIHZhciBkZWxldGVkID0gW10sXG4gICAgICBkZWxldGVkQ29sLFxuICAgICAgY29sc1R5cGUgPSB1dGlscy50eXBlKGNvbHMpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgcm93Q291bnQgPSBhcnIubGVuZ3RoLFxuICAgICAgICBpID0gMDtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29scywgdHJ1ZSwgY291bnQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sc1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgZGVsZXRlZENvbCA9IHNwcmVhZEFycmF5KGFycltpXSwgYmVnaW4sIGNvbHMpO1xuICAgICAgICBpZiAoZGVsZXRlZENvbC5sZW5ndGgpIHtcbiAgICAgICAgICBkZWxldGVkLnB1c2goZGVsZXRlZENvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbHNUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29sc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzMmRBcnJheTogaXMyZEFycmF5LFxuICBjcmVhdGVBcnJheTogY3JlYXRlQXJyYXksXG4gIGNyZWF0ZTJkQXJyYXk6IGNyZWF0ZTJkQXJyYXksXG4gIHBhcnNlQXJyYXlJbmRleDogcGFyc2VBcnJheUluZGV4LFxuICBnZXRBcnJheUluZGV4QnlWYWx1ZTogZ2V0QXJyYXlJbmRleEJ5VmFsdWUsXG4gIG1vdmVBcnJheUl0ZW1VcDogbW92ZUFycmF5SXRlbVVwLFxuICBtb3ZlQXJyYXlJdGVtRG93bjogbW92ZUFycmF5SXRlbURvd24sXG4gIHNwcmVhZEFycmF5OiBzcHJlYWRBcnJheSxcbiAgc3ByZWFkMmRBcnJheVJvdzogc3ByZWFkMmRBcnJheVJvdyxcbiAgc3ByZWFkMmRBcnJheUNvbDogc3ByZWFkMmRBcnJheUNvbFxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGdldE9iamVjdEtleUJ5VmFsdWUgPSBmdW5jdGlvbiBnZXRPYmplY3RLZXlCeVZhbHVlKG9iaiwgdmFsdWUpIHtcbiAgdmFyIG9iaktleSwgb2JqVmFsdWUsIHZhbHVlS2V5O1xuICBpZiAodXRpbHMudHlwZSh2YWx1ZSkgPT09ICdvYmplY3QnKSB7XG4gICAgb3V0ZXI6IGZvciAob2JqS2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShvYmpLZXkpICYmIHV0aWxzLnR5cGUob2JqVmFsdWUgPSBvYmpbb2JqS2V5XSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZvciAodmFsdWVLZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkodmFsdWVLZXkpICYmIHZhbHVlW3ZhbHVlS2V5XSAhPT0gb2JqVmFsdWVbdmFsdWVLZXldKSB7XG4gICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgb2JqW29iaktleV0gPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBvYmpLZXk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuICB2YXIgdGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuICAgICAgYXJnTGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmdMZW47IGkrKykge1xuICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV0sXG4gICAgICAgIGtleTtcbiAgICBpZiAodXRpbHMudHlwZShzb3VyY2UpID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yIChrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHRhcmdldFtrZXldID0gdXRpbHMuY29weShzb3VyY2Vba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBoYXNPd25Qcm9wZXJ0eTogT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIGdldE9iamVjdEtleUJ5VmFsdWU6IGdldE9iamVjdEtleUJ5VmFsdWVcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBwYXRjaFR5cGVzID0ge1xuICBhZGQ6ICdhZGQnLFxuICByZW1vdmU6ICdyZW1vdmUnLFxuICB1cGRhdGU6ICd1cGRhdGUnLFxuICBzZXQ6ICdzZXQnLFxuICBtb3ZlVXA6ICdtb3ZlVXAnLFxuICBtb3ZlRG93bjogJ21vdmVEb3duJyxcbiAgbW92ZVRvOiAnbW92ZVRvJyxcbiAgZXhjaGFuZ2U6ICdleGNoYW5nZScsXG4gIGV4dGVuZE9iamVjdDogJ2V4dGVuZE9iamVjdCcsXG4gIHNwcmVhZEFycmF5OiAnc3ByZWFkQXJyYXknLFxuICBzcHJlYWQyZEFycmF5Q29sOiAnc3ByZWFkMmRBcnJheUNvbCcsXG4gIHNwcmVhZDJkQXJyYXlSb3c6ICdzcHJlYWQyZEFycmF5Um93J1xufTtcblxudmFyIGNyZWF0ZVBhdGNoID0gZnVuY3Rpb24gY3JlYXRlUGF0Y2godHlwZSwgYXJncykge1xuICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncyk7XG4gIHJldHVybiB1dGlscy5jb3B5KHtcbiAgICB0eXBlOiB0eXBlLFxuICAgIGFyZ3M6IGFyZ3NcbiAgfSk7XG59O1xuXG4vKipcbiAqIGNyZWF0ZSBwYXRjaCBvcGVyYXRpb25zXG4gKiAqL1xuXG52YXIgcGF0Y2hNZXRob2RzID0ge1xuICBjcmVhdGVBZGQ6IGZ1bmN0aW9uIGNyZWF0ZUFkZChwYXRoLCB2YWx1ZSwga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuYWRkLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVSZW1vdmU6IGZ1bmN0aW9uIGNyZWF0ZVJlbW92ZShwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMucmVtb3ZlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVVcGRhdGU6IGZ1bmN0aW9uIGNyZWF0ZVVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy51cGRhdGUsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNldDogZnVuY3Rpb24gY3JlYXRlU2V0KHBhdGgsIHZhbHVlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc2V0LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVXA6IGZ1bmN0aW9uIGNyZWF0ZU1vdmVVcChwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVVwLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlRG93bjogZnVuY3Rpb24gY3JlYXRlTW92ZURvd24ocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLm1vdmVEb3duLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVG86IGZ1bmN0aW9uIGNyZWF0ZU1vdmVUbyhmcm9tLCB0bywga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVRvLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeGNoYW5nZTogZnVuY3Rpb24gY3JlYXRlRXhjaGFuZ2UoZnJvbSwgdG8pIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5leGNoYW5nZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlRXh0ZW5kT2JqZWN0OiBmdW5jdGlvbiBjcmVhdGVFeHRlbmRPYmplY3QocGF0aCwgYSwgYiwgYywgZCwgZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4dGVuZE9iamVjdCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkQXJyYXk6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWRBcnJheSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlSb3csIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWQyZEFycmF5Q29sLCBhcmd1bWVudHMpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoTWV0aG9kczsiLCIndXNlIHN0cmljdCc7XG5cbnZhciByZWZlcmVuY2VUeXBlcyA9IHtcbiAgJ2FycmF5JzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWVcbn07XG5cbnZhciBjb21tb25LZXlUeXBlcyA9IHtcbiAgJ3N0cmluZyc6IHRydWUsXG4gICdudW1iZXInOiB0cnVlXG59O1xuXG52YXIgdHlwZSA9IGZ1bmN0aW9uIHR5cGUoZGF0YSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGEpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xufTtcblxudmFyIGlzUmVmZXJlbmNlVHlwZSA9IGZ1bmN0aW9uIGlzUmVmZXJlbmNlVHlwZShkYXRhKSB7XG4gIHJldHVybiByZWZlcmVuY2VUeXBlc1t0eXBlKGRhdGEpXSB8fCBmYWxzZTtcbn07XG5cbnZhciBpc0NvbW1vbktleVR5cGUgPSBmdW5jdGlvbiBpc0NvbW1vbktleVR5cGUoa2V5KSB7XG4gIHJldHVybiBjb21tb25LZXlUeXBlc1t0eXBlKGtleSldIHx8IGZhbHNlO1xufTtcblxudmFyIGNvcHkgPSBmdW5jdGlvbiBjb3B5KGRhdGEpIHtcbiAgcmV0dXJuIGlzUmVmZXJlbmNlVHlwZShkYXRhKSA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpIDogZGF0YTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0eXBlOiB0eXBlLFxuICBjb3B5OiBjb3B5LFxuICBpc1JlZmVyZW5jZVR5cGU6IGlzUmVmZXJlbmNlVHlwZSxcbiAgaXNDb21tb25LZXlUeXBlOiBpc0NvbW1vbktleVR5cGVcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL0pTT05EYXRhU3RvcmUnKTsiXX0=
