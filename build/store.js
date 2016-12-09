(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JSONStore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');
var array = _dereq_('./array');
var object = _dereq_('./object');
var patchMethods = _dereq_('./patch');

function JSONDataStore(options) {
  options = options || {};
  this.initialOptions = utils.copy(options);
  var store = options.store,
      copyStore = options.copyStore !== false;
  this.store = copyStore ? utils.copy(store) : store;
  // 'do' about attributes
  this.patches = [];
  this.relativePatches = [];
  this.backPatches = [];
  this.currentPath = [];
  this.isDoing = false;
}

JSONDataStore.prototype = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy8uNi4wLjFAYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvSlNPTkRhdGFTdG9yZS5qcyIsImJ1aWxkL21vZHVsZXMvbGliL2FycmF5LmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvb2JqZWN0LmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvcGF0Y2guanMiLCJidWlsZC9tb2R1bGVzL2xpYi91dGlscy5qcyIsImJ1aWxkL21vZHVsZXMvc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xudmFyIG9iamVjdCA9IHJlcXVpcmUoJy4vb2JqZWN0Jyk7XG52YXIgcGF0Y2hNZXRob2RzID0gcmVxdWlyZSgnLi9wYXRjaCcpO1xuXG5mdW5jdGlvbiBKU09ORGF0YVN0b3JlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMuaW5pdGlhbE9wdGlvbnMgPSB1dGlscy5jb3B5KG9wdGlvbnMpO1xuICB2YXIgc3RvcmUgPSBvcHRpb25zLnN0b3JlLFxuICAgICAgY29weVN0b3JlID0gb3B0aW9ucy5jb3B5U3RvcmUgIT09IGZhbHNlO1xuICB0aGlzLnN0b3JlID0gY29weVN0b3JlID8gdXRpbHMuY29weShzdG9yZSkgOiBzdG9yZTtcbiAgLy8gJ2RvJyBhYm91dCBhdHRyaWJ1dGVzXG4gIHRoaXMucGF0Y2hlcyA9IFtdO1xuICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICB0aGlzLmJhY2tQYXRjaGVzID0gW107XG4gIHRoaXMuY3VycmVudFBhdGggPSBbXTtcbiAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG59XG5cbkpTT05EYXRhU3RvcmUucHJvdG90eXBlID0ge1xuICBfZ2V0UmVmOiBmdW5jdGlvbiBfZ2V0UmVmKHBhdGgpIHtcbiAgICB2YXIgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHJlZiA9IHJlZltwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZjtcbiAgfSxcbiAgX2RldGVjdFBhdGg6IGZ1bmN0aW9uIF9kZXRlY3RQYXRoKHBhdGgpIHtcbiAgICB2YXIgZGV0ZWN0ZWQgPSBbXSxcbiAgICAgICAgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBrZXksXG4gICAgICAgIGtleVR5cGUsXG4gICAgICAgIHJlZlR5cGU7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcGF0aFtpXTtcbiAgICAgIGtleVR5cGUgPSB1dGlscy50eXBlKGtleSk7XG4gICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgb2JqS2V5ID0gb2JqZWN0LmdldE9iamVjdEtleUJ5VmFsdWUocmVmLCBrZXkuX192YWx1ZSk7XG4gICAgICAgICAgaWYgKG9iaktleSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW29iaktleV07XG4gICAgICAgICAgICBkZXRlY3RlZC5wdXNoKG9iaktleSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5nZXRBcnJheUluZGV4QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW2luZGV4XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2goaW5kZXgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlZiwga2V5KSkge1xuICAgICAgICAgIHJlZiA9IHJlZltrZXldO1xuICAgICAgICAgIGRldGVjdGVkLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRldGVjdGVkO1xuICB9LFxuICBfZm9ybWF0UGF0aDogZnVuY3Rpb24gX2Zvcm1hdFBhdGgocGF0aCwgZGV0ZWN0KSB7XG4gICAgdmFyIHBhdGhUeXBlID0gdXRpbHMudHlwZShwYXRoKTtcbiAgICBpZiAocGF0aFR5cGUgPT09ICd1bmRlZmluZWQnIHx8IHBhdGhUeXBlID09PSAnbnVsbCcpIHtcbiAgICAgIHBhdGggPSBbXTtcbiAgICB9IGVsc2UgaWYgKHBhdGhUeXBlICE9PSAnYXJyYXknKSB7XG4gICAgICBwYXRoID0gW3BhdGhdO1xuICAgIH1cbiAgICBpZiAoZGV0ZWN0ICE9PSBmYWxzZSkge1xuICAgICAgdmFyIGRldGVjdGVkID0gdGhpcy5fZGV0ZWN0UGF0aChwYXRoKTtcbiAgICAgIGlmIChkZXRlY3RlZC5sZW5ndGggPT09IHBhdGgubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBkZXRlY3RlZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfSxcbiAgX21vdmVBcnJheUl0ZW06IGZ1bmN0aW9uIF9tb3ZlQXJyYXlJdGVtKHBhdGgsIG1vdmVVcCkge1xuICAgIHZhciBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghZnVsbFBhdGggfHwgZnVsbFBhdGgubGVuZ3RoIDwgMSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGl0ZW1JbmRleCA9IGZ1bGxQYXRoLnBvcCgpLFxuICAgICAgICBhcnIgPSB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpO1xuICAgIGlmICh1dGlscy50eXBlKGFycikgIT09ICdhcnJheScpIHJldHVybiB0aGlzO1xuICAgIHZhciBtZXRob2QgPSBtb3ZlVXAgPT09IHRydWUgPyAnY3JlYXRlTW92ZVVwJyA6ICdjcmVhdGVNb3ZlRG93bicsXG4gICAgICAgIHJldmVyc2VNZXRob2QgPSBtZXRob2QgPT09ICdjcmVhdGVNb3ZlVXAnID8gJ2NyZWF0ZU1vdmVEb3duJyA6ICdjcmVhdGVNb3ZlVXAnO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kc1ttZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kc1ttZXRob2RdKHRoaXMuX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aC5jb25jYXQoaXRlbUluZGV4KSkpKTtcbiAgICAgIGlmIChtb3ZlVXAgPT09IHRydWUgJiYgaXRlbUluZGV4ID4gMCB8fCBtb3ZlVXAgIT09IHRydWUgJiYgaXRlbUluZGV4IDwgYXJyLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kc1tyZXZlcnNlTWV0aG9kXShmdWxsUGF0aC5jb25jYXQobW92ZVVwID09PSB0cnVlID8gaXRlbUluZGV4IC0gMSA6IGl0ZW1JbmRleCArIDEpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtb3ZlVXAgPT09IHRydWUpIHtcbiAgICAgIGFycmF5Lm1vdmVBcnJheUl0ZW1VcChhcnIsIGl0ZW1JbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFycmF5Lm1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaXRlbUluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9nZXRGdWxsUGF0aDogZnVuY3Rpb24gX2dldEZ1bGxQYXRoKHBhdGgpIHtcbiAgICBpZiAodXRpbHMuaXNSZWZlcmVuY2VUeXBlKHBhdGgpICYmIHBhdGguaXNGdWxsKSB7XG4gICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG4gICAgdmFyIGN1cnJlbnRQYXRoID0gdGhpcy5fZm9ybWF0UGF0aCh0aGlzLmN1cnJlbnRQYXRoLCBmYWxzZSksXG4gICAgICAgIGZ1bGxQYXRoID0gY3VycmVudFBhdGguY29uY2F0KHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpKSxcbiAgICAgICAgZm9ybWF0dGVkRnVsbFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKGZ1bGxQYXRoKTtcbiAgICBpZiAoZm9ybWF0dGVkRnVsbFBhdGgpIHtcbiAgICAgIGZvcm1hdHRlZEZ1bGxQYXRoLmlzRnVsbCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmb3JtYXR0ZWRGdWxsUGF0aDtcbiAgfSxcbiAgX2dldFJlbGF0aXZlUGF0aDogZnVuY3Rpb24gX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aCkge1xuICAgIHJldHVybiBmdWxsUGF0aC5zbGljZSh0aGlzLmN1cnJlbnRQYXRoLmxlbmd0aCk7XG4gIH0sXG4gIHJlSW5pdDogZnVuY3Rpb24gcmVJbml0KG9wdGlvbnMpIHtcbiAgICBKU09ORGF0YVN0b3JlLmNhbGwodGhpcywgb3B0aW9ucyB8fCB0aGlzLmluaXRpYWxPcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZ29UbzogZnVuY3Rpb24gZ29UbyhwYXRoLCBhZGRVcCkge1xuICAgIGlmICghdGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgdXNpbmcgc3RvcmUuZ29UbyBvdXRzaWRlIHN0b3JlLmRvIScpO1xuICAgIH1cbiAgICBpZiAoYWRkVXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkbzogZnVuY3Rpb24gX2RvKG5hbWUsIGFjdGlvbiwgYSwgYiwgYywgZCwgZSwgZikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB0aGlzLmlzRG9pbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbmFtZSh0aGlzLCBhY3Rpb24sIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWN0aW9uKHRoaXMsIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcGFyYW1ldGVyIGFjdGlvbi4nKTtcbiAgICB9XG4gICAgLy8gY29tcG9zZSByZXN1bHRcbiAgICByZXN1bHQucGF0Y2hlcyA9IHRoaXMucGF0Y2hlcztcbiAgICByZXN1bHQucmVsYXRpdmVQYXRjaGVzID0gdGhpcy5yZWxhdGl2ZVBhdGNoZXM7XG4gICAgcmVzdWx0LmJhY2tQYXRjaGVzID0gdGhpcy5iYWNrUGF0Y2hlcztcbiAgICAvLyByZXNldCAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gICAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgYWRkOiBmdW5jdGlvbiBhZGQocGF0aCwgdmFsdWUsIGtleSkge1xuICAgIHZhciByZWYsIHJlZlR5cGU7XG4gICAgcGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghcGF0aCB8fCAhdXRpbHMuaXNSZWZlcmVuY2VUeXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgKHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZikpID09PSAnb2JqZWN0JyAmJiAhdXRpbHMuaXNDb21tb25LZXlUeXBlKGtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUFkZCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIHZhbHVlLCBrZXkpKTtcbiAgICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoLmNvbmNhdChrZXkpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlZltrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5LnBhcnNlQXJyYXlJbmRleChrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmLnNwbGljZShpbmRleCwgMCwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVmLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUocGF0aCkge1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUocGF0aCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCksIHRydWUpKTtcbiAgICB9XG4gICAgaWYgKHBhdGgubGVuZ3RoIDwgMSkge1xuICAgICAgdGhpcy5zdG9yZSA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbGFzdEtleSA9IHBhdGgucG9wKCksXG4gICAgICAgIHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSxcbiAgICAgICAgcmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKTtcbiAgICBpZiAocmVmVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgcmVmLnNwbGljZShsYXN0S2V5LCAxKTtcbiAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBkZWxldGUgcmVmW2xhc3RLZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlKSB7XG4gICAgcGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciBsYXN0S2V5LFxuICAgICAgICBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmIChmdWxsUGF0aCkge1xuICAgICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB2YWx1ZSkpO1xuICAgICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUoZnVsbFBhdGgsIHRoaXMuZ2V0KGZ1bGxQYXRoKSkpO1xuICAgICAgfVxuICAgICAgbGFzdEtleSA9IGZ1bGxQYXRoLnBvcCgpO1xuICAgICAgaWYgKGxhc3RLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpW2xhc3RLZXldID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2UgaWYgKGZvcmNlVXBkYXRlID09PSB0cnVlICYmIHBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgbGFzdEtleSA9IHBhdGgucG9wKCk7XG4gICAgICByZXR1cm4gdGhpcy5hZGQocGF0aCwgdmFsdWUsIGxhc3RLZXkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbiBzZXQocGF0aCwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUocGF0aCwgdmFsdWUsIHRydWUpO1xuICB9LFxuICBtb3ZlVXA6IGZ1bmN0aW9uIG1vdmVVcChwYXRoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21vdmVBcnJheUl0ZW0ocGF0aCwgdHJ1ZSk7XG4gIH0sXG4gIG1vdmVEb3duOiBmdW5jdGlvbiBtb3ZlRG93bihwYXRoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21vdmVBcnJheUl0ZW0ocGF0aCk7XG4gIH0sXG4gIG1vdmVUbzogZnVuY3Rpb24gbW92ZVRvKGZyb20sIHRvLCBrZXkpIHtcbiAgICBmcm9tID0gdGhpcy5fZ2V0RnVsbFBhdGgoZnJvbSk7XG4gICAgdG8gPSB0aGlzLl9nZXRGdWxsUGF0aCh0byk7XG4gICAgaWYgKCFmcm9tIHx8ICF0byB8fCAhdXRpbHMuaXNSZWZlcmVuY2VUeXBlKHRoaXMuX2dldFJlZih0bykpKSByZXR1cm4gdGhpcztcbiAgICB0aGlzLmFkZCh0bywgdGhpcy5fZ2V0UmVmKGZyb20pLCBrZXkpO1xuICAgIHRoaXMucmVtb3ZlKGZyb20pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBleGNoYW5nZTogZnVuY3Rpb24gZXhjaGFuZ2UoZnJvbSwgdG8pIHtcbiAgICBmcm9tID0gdGhpcy5fZ2V0RnVsbFBhdGgoZnJvbSk7XG4gICAgdG8gPSB0aGlzLl9nZXRGdWxsUGF0aCh0byk7XG4gICAgaWYgKGZyb20gJiYgdG8pIHtcbiAgICAgIHZhciBmcm9tUmVmID0gdGhpcy5fZ2V0UmVmKGZyb20pLFxuICAgICAgICAgIHRvUmVmID0gdGhpcy5nZXQodG8pO1xuICAgICAgdGhpcy51cGRhdGUoZnJvbSwgdG9SZWYpO1xuICAgICAgdGhpcy51cGRhdGUodG8sIGZyb21SZWYpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZXh0ZW5kT2JqZWN0OiBmdW5jdGlvbiBleHRlbmRPYmplY3QocGF0aCwgYSwgYiwgYywgZCwgZSwgZikge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCB1dGlscy50eXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgIT09ICdvYmplY3QnKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlRXh0ZW5kT2JqZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlRXh0ZW5kT2JqZWN0KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYSwgYiwgYywgZCwgZSwgZikpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgb2JqZWN0LmV4dGVuZChyZWYsIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzcHJlYWRBcnJheTogZnVuY3Rpb24gc3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCB1dGlscy50eXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgIT09ICdhcnJheScpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHR5cGVvZiBiZWdpbiA9PT0gJ251bWJlcicgPyBiZWdpbiA6IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZEFycmF5KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkQXJyYXkocmVmLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gc3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSB0eXBlb2YgYmVnaW4gPT09ICdudW1iZXInID8gYmVnaW4gOiByZWYubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlSb3cocmVmLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICB2YXIgcmVmO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkgfHwgIWFycmF5LmlzMmRBcnJheShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8ICEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gdHlwZW9mIGJlZ2luID09PSAnbnVtYmVyJyA/IGJlZ2luIDogcmVmWzBdLmxlbmd0aDtcbiAgICBpZiAoISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkMmRBcnJheUNvbCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBhcnJheS5zcHJlYWQyZEFycmF5Q29sKHJlZiwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uIGdldChwYXRoLCBjb3B5KSB7XG4gICAgaWYgKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkge1xuICAgICAgcmV0dXJuIGNvcHkgPT09IGZhbHNlID8gdGhpcy5fZ2V0UmVmKHBhdGgpIDogdXRpbHMuY29weSh0aGlzLl9nZXRSZWYocGF0aCkpO1xuICAgIH1cbiAgfSxcbiAgcGF0Y2g6IGZ1bmN0aW9uIHBhdGNoKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgZGVwcmVjYXRlZCwgdXNlIEpTT05TdG9yZS5wYXRjaCBpbnN0ZWFkLicpO1xuICB9LFxuICBhcHBseVBhdGNoOiBmdW5jdGlvbiBhcHBseVBhdGNoKHBhdGNoZXMpIHtcbiAgICBwYXRjaGVzID0gdXRpbHMudHlwZShwYXRjaGVzKSA9PT0gJ2FycmF5JyA/IHBhdGNoZXMgOiBbcGF0Y2hlc107XG4gICAgcGF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRjaCkge1xuICAgICAgdGhpc1twYXRjaC50eXBlXS5hcHBseSh0aGlzLCBwYXRjaC5hcmdzKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG5KU09ORGF0YVN0b3JlLlBhdGNoID0gcGF0Y2hNZXRob2RzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEpTT05EYXRhU3RvcmU7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBzcGxpY2UgPSBBcnJheS5wcm90b3R5cGUuc3BsaWNlO1xuXG52YXIgY3JlYXRlQXJyYXkgPSBmdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgsIGluZmlsbGluZykge1xuICBsZW5ndGggPSBsZW5ndGggfHwgMDtcbiAgdmFyIGFyciA9IFtdLFxuICAgICAgaSA9IDA7XG4gIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBhcnIucHVzaChpbmZpbGxpbmcgPT09IHVuZGVmaW5lZCA/IG51bGwgOiB1dGlscy5jb3B5KGluZmlsbGluZykpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG52YXIgaXMyZEFycmF5ID0gZnVuY3Rpb24gaXMyZEFycmF5KGFycikge1xuICB2YXIgaXMyZDtcbiAgaWYgKGlzMmQgPSB1dGlscy50eXBlKGFycikgPT09ICdhcnJheScgJiYgYXJyLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IGFyci5sZW5ndGg7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaXMyZCAmPSB1dGlscy50eXBlKGFycltpXSkgPT09ICdhcnJheSc7XG4gICAgICBpZiAoIWlzMmQpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGNyZWF0ZTJkQXJyYXkgPSBmdW5jdGlvbiBjcmVhdGUyZEFycmF5KHJvdywgY29sLCBpbmZpbGxpbmcpIHtcbiAgcm93ID0gcm93IHx8IDA7XG4gIGNvbCA9IGNvbCB8fCAwO1xuICB2YXIgYXJyID0gbmV3IEFycmF5KHJvdyksXG4gICAgICBpID0gMDtcbiAgZm9yICg7IGkgPCByb3c7IGkrKykge1xuICAgIGFycltpXSA9IGNyZWF0ZUFycmF5KGNvbCwgaW5maWxsaW5nKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudmFyIHBhcnNlQXJyYXlJbmRleCA9IGZ1bmN0aW9uIHBhcnNlQXJyYXlJbmRleChpbmRleCkge1xuICB2YXIgdHlwZSA9IHV0aWxzLnR5cGUoaW5kZXgpO1xuICBpZiAodHlwZSA9PT0gJ3N0cmluZycgfHwgdHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gcGFyc2VJbnQoaW5kZXgpO1xuICB9XG4gIHJldHVybiB2b2lkIDA7XG59O1xuXG52YXIgZ2V0QXJyYXlJbmRleEJ5VmFsdWUgPSBmdW5jdGlvbiBnZXRBcnJheUluZGV4QnlWYWx1ZShhcnIsIHZhbHVlKSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICB2YXIgdmFsdWVUeXBlID0gdXRpbHMudHlwZSh2YWx1ZSk7XG4gICAgaWYgKHZhbHVlVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICBsZW4gPSBhcnIubGVuZ3RoLFxuICAgICAgICAgIGl0ZW07XG4gICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBhcnJbaV07XG4gICAgICAgIHZhciBpc0VxdWFsID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpc0VxdWFsID0gaXRlbVtrZXldID09PSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgaWYgKCFpc0VxdWFsKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRXF1YWwpIHtcbiAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYXJyLmluZGV4T2YodmFsdWUpO1xuICAgIH1cbiAgfVxufTtcblxudmFyIG1vdmVBcnJheUl0ZW1VcCA9IGZ1bmN0aW9uIG1vdmVBcnJheUl0ZW1VcChhcnIsIGluZGV4KSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICBpbmRleCA9IHBhcnNlQXJyYXlJbmRleChpbmRleCk7XG4gICAgdmFyIGN1cnJJdGVtID0gYXJyW2luZGV4XTtcbiAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICBhcnJbaW5kZXhdID0gYXJyW2luZGV4IC0gMV07XG4gICAgICBhcnJbaW5kZXggLSAxXSA9IGN1cnJJdGVtO1xuICAgIH1cbiAgfVxufTtcblxudmFyIG1vdmVBcnJheUl0ZW1Eb3duID0gZnVuY3Rpb24gbW92ZUFycmF5SXRlbURvd24oYXJyLCBpbmRleCkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgaW5kZXggPSBwYXJzZUFycmF5SW5kZXgoaW5kZXgpO1xuICAgIHZhciBjdXJySXRlbSA9IGFycltpbmRleF07XG4gICAgaWYgKGluZGV4IDwgYXJyLmxlbmd0aCAtIDEpIHtcbiAgICAgIGFycltpbmRleF0gPSBhcnJbaW5kZXggKyAxXTtcbiAgICAgIGFycltpbmRleCArIDFdID0gY3Vyckl0ZW07XG4gICAgfVxuICB9XG59O1xuXG52YXIgc3ByZWFkQXJyYXkgPSBmdW5jdGlvbiBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXTtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIHZhciBpbmZpbGxpbmdUeXBlID0gdXRpbHMudHlwZShpbmZpbGxpbmcpO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGNyZWF0ZUFycmF5KHBhcnNlSW50KGNvdW50KSB8fCAxLCBpbmZpbGxpbmcpKSk7XG4gICAgfSBlbHNlIGlmIChpbmZpbGxpbmdUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChpbmZpbGxpbmcpKTtcbiAgICB9IGVsc2UgaWYgKGluZmlsbGluZ1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAoaW5maWxsaW5nID4gMCkge1xuICAgICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChjcmVhdGVBcnJheShpbmZpbGxpbmcpKSk7XG4gICAgICB9IGVsc2UgaWYgKGluZmlsbGluZyA8IDApIHtcbiAgICAgICAgZGVsZXRlZCA9IHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgTWF0aC5hYnMoaW5maWxsaW5nKV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbnZhciBzcHJlYWQyZEFycmF5Um93ID0gZnVuY3Rpb24gc3ByZWFkMmRBcnJheVJvdyhhcnIsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gIHZhciBkZWxldGVkID0gW10sXG4gICAgICByb3dzVHlwZSA9IHV0aWxzLnR5cGUocm93cyk7XG4gIGlmIChpczJkQXJyYXkoYXJyKSkge1xuICAgIHZhciBjb2xDb3VudCA9IGFyclswXS5sZW5ndGg7XG4gICAgaWYgKHNpbXBsZUluZmlsbGluZyA9PT0gdHJ1ZSkge1xuICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgY3JlYXRlQXJyYXkoY29sQ291bnQsIHJvd3MpLCB0cnVlLCBjb3VudCk7XG4gICAgfSBlbHNlIGlmIChyb3dzVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGlmIChyb3dzID4gMCkge1xuICAgICAgICBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCBjcmVhdGUyZEFycmF5KHJvd3MsIGNvbENvdW50KSk7XG4gICAgICB9IGVsc2UgaWYgKHJvd3MgPCAwKSB7XG4gICAgICAgIGRlbGV0ZWQgPSBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCByb3dzKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJvd3NUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCByb3dzKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG52YXIgc3ByZWFkMmRBcnJheUNvbCA9IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlDb2woYXJyLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICB2YXIgZGVsZXRlZCA9IFtdLFxuICAgICAgZGVsZXRlZENvbCxcbiAgICAgIGNvbHNUeXBlID0gdXRpbHMudHlwZShjb2xzKTtcbiAgaWYgKGlzMmRBcnJheShhcnIpKSB7XG4gICAgdmFyIHJvd0NvdW50ID0gYXJyLmxlbmd0aCxcbiAgICAgICAgaSA9IDA7XG4gICAgaWYgKHNpbXBsZUluZmlsbGluZyA9PT0gdHJ1ZSkge1xuICAgICAgZm9yICg7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIHNwcmVhZEFycmF5KGFycltpXSwgYmVnaW4sIGNvbHMsIHRydWUsIGNvdW50KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbHNUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgZm9yICg7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIGRlbGV0ZWRDb2wgPSBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzKTtcbiAgICAgICAgaWYgKGRlbGV0ZWRDb2wubGVuZ3RoKSB7XG4gICAgICAgICAgZGVsZXRlZC5wdXNoKGRlbGV0ZWRDb2wpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xzVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgZm9yICg7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIHNwcmVhZEFycmF5KGFycltpXSwgYmVnaW4sIGNvbHNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpczJkQXJyYXk6IGlzMmRBcnJheSxcbiAgY3JlYXRlQXJyYXk6IGNyZWF0ZUFycmF5LFxuICBjcmVhdGUyZEFycmF5OiBjcmVhdGUyZEFycmF5LFxuICBwYXJzZUFycmF5SW5kZXg6IHBhcnNlQXJyYXlJbmRleCxcbiAgZ2V0QXJyYXlJbmRleEJ5VmFsdWU6IGdldEFycmF5SW5kZXhCeVZhbHVlLFxuICBtb3ZlQXJyYXlJdGVtVXA6IG1vdmVBcnJheUl0ZW1VcCxcbiAgbW92ZUFycmF5SXRlbURvd246IG1vdmVBcnJheUl0ZW1Eb3duLFxuICBzcHJlYWRBcnJheTogc3ByZWFkQXJyYXksXG4gIHNwcmVhZDJkQXJyYXlSb3c6IHNwcmVhZDJkQXJyYXlSb3csXG4gIHNwcmVhZDJkQXJyYXlDb2w6IHNwcmVhZDJkQXJyYXlDb2xcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBnZXRPYmplY3RLZXlCeVZhbHVlID0gZnVuY3Rpb24gZ2V0T2JqZWN0S2V5QnlWYWx1ZShvYmosIHZhbHVlKSB7XG4gIHZhciBvYmpLZXksIG9ialZhbHVlLCB2YWx1ZUtleTtcbiAgaWYgKHV0aWxzLnR5cGUodmFsdWUpID09PSAnb2JqZWN0Jykge1xuICAgIG91dGVyOiBmb3IgKG9iaktleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkob2JqS2V5KSAmJiB1dGlscy50eXBlKG9ialZhbHVlID0gb2JqW29iaktleV0pID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhbHVlS2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KHZhbHVlS2V5KSAmJiB2YWx1ZVt2YWx1ZUtleV0gIT09IG9ialZhbHVlW3ZhbHVlS2V5XSkge1xuICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmpLZXk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAob2JqS2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShvYmpLZXkpICYmIG9ialtvYmpLZXldID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gb2JqS2V5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgdmFyIHRhcmdldCA9IGFyZ3VtZW50c1swXSxcbiAgICAgIGFyZ0xlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJnTGVuOyBpKyspIHtcbiAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldLFxuICAgICAgICBrZXk7XG4gICAgaWYgKHV0aWxzLnR5cGUoc291cmNlKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICB0YXJnZXRba2V5XSA9IHV0aWxzLmNvcHkoc291cmNlW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaGFzT3duUHJvcGVydHk6IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG4gIGV4dGVuZDogZXh0ZW5kLFxuICBnZXRPYmplY3RLZXlCeVZhbHVlOiBnZXRPYmplY3RLZXlCeVZhbHVlXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgcGF0Y2hUeXBlcyA9IHtcbiAgYWRkOiAnYWRkJyxcbiAgcmVtb3ZlOiAncmVtb3ZlJyxcbiAgdXBkYXRlOiAndXBkYXRlJyxcbiAgc2V0OiAnc2V0JyxcbiAgbW92ZVVwOiAnbW92ZVVwJyxcbiAgbW92ZURvd246ICdtb3ZlRG93bicsXG4gIG1vdmVUbzogJ21vdmVUbycsXG4gIGV4Y2hhbmdlOiAnZXhjaGFuZ2UnLFxuICBleHRlbmRPYmplY3Q6ICdleHRlbmRPYmplY3QnLFxuICBzcHJlYWRBcnJheTogJ3NwcmVhZEFycmF5JyxcbiAgc3ByZWFkMmRBcnJheUNvbDogJ3NwcmVhZDJkQXJyYXlDb2wnLFxuICBzcHJlYWQyZEFycmF5Um93OiAnc3ByZWFkMmRBcnJheVJvdydcbn07XG5cbnZhciBjcmVhdGVQYXRjaCA9IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoKHR5cGUsIGFyZ3MpIHtcbiAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MpO1xuICByZXR1cm4gdXRpbHMuY29weSh7XG4gICAgdHlwZTogdHlwZSxcbiAgICBhcmdzOiBhcmdzXG4gIH0pO1xufTtcblxuLyoqXG4gKiBjcmVhdGUgcGF0Y2ggb3BlcmF0aW9uc1xuICogKi9cblxudmFyIHBhdGNoTWV0aG9kcyA9IHtcbiAgY3JlYXRlQWRkOiBmdW5jdGlvbiBjcmVhdGVBZGQocGF0aCwgdmFsdWUsIGtleSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmFkZCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlUmVtb3ZlOiBmdW5jdGlvbiBjcmVhdGVSZW1vdmUocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnJlbW92ZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlVXBkYXRlOiBmdW5jdGlvbiBjcmVhdGVVcGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMudXBkYXRlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTZXQ6IGZ1bmN0aW9uIGNyZWF0ZVNldChwYXRoLCB2YWx1ZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNldCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlTW92ZVVwOiBmdW5jdGlvbiBjcmVhdGVNb3ZlVXAocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLm1vdmVVcCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlTW92ZURvd246IGZ1bmN0aW9uIGNyZWF0ZU1vdmVEb3duKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlRG93biwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlTW92ZVRvOiBmdW5jdGlvbiBjcmVhdGVNb3ZlVG8oZnJvbSwgdG8sIGtleSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLm1vdmVUbywgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlRXhjaGFuZ2U6IGZ1bmN0aW9uIGNyZWF0ZUV4Y2hhbmdlKGZyb20sIHRvKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuZXhjaGFuZ2UsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZUV4dGVuZE9iamVjdDogZnVuY3Rpb24gY3JlYXRlRXh0ZW5kT2JqZWN0KHBhdGgsIGEsIGIsIGMsIGQsIGUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5leHRlbmRPYmplY3QsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNwcmVhZEFycmF5OiBmdW5jdGlvbiBjcmVhdGVTcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc3ByZWFkQXJyYXksIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNwcmVhZDJkQXJyYXlSb3c6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWQyZEFycmF5Um93LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWQyZEFycmF5Q29sOiBmdW5jdGlvbiBjcmVhdGVTcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc3ByZWFkMmRBcnJheUNvbCwgYXJndW1lbnRzKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaE1ldGhvZHM7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVmZXJlbmNlVHlwZXMgPSB7XG4gICdhcnJheSc6IHRydWUsXG4gICdvYmplY3QnOiB0cnVlXG59O1xuXG52YXIgY29tbW9uS2V5VHlwZXMgPSB7XG4gICdzdHJpbmcnOiB0cnVlLFxuICAnbnVtYmVyJzogdHJ1ZVxufTtcblxudmFyIHR5cGUgPSBmdW5jdGlvbiB0eXBlKGRhdGEpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkYXRhKS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcbn07XG5cbnZhciBpc1JlZmVyZW5jZVR5cGUgPSBmdW5jdGlvbiBpc1JlZmVyZW5jZVR5cGUoZGF0YSkge1xuICByZXR1cm4gcmVmZXJlbmNlVHlwZXNbdHlwZShkYXRhKV0gfHwgZmFsc2U7XG59O1xuXG52YXIgaXNDb21tb25LZXlUeXBlID0gZnVuY3Rpb24gaXNDb21tb25LZXlUeXBlKGtleSkge1xuICByZXR1cm4gY29tbW9uS2V5VHlwZXNbdHlwZShrZXkpXSB8fCBmYWxzZTtcbn07XG5cbnZhciBjb3B5ID0gZnVuY3Rpb24gY29weShkYXRhKSB7XG4gIHJldHVybiBpc1JlZmVyZW5jZVR5cGUoZGF0YSkgPyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKSA6IGRhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdHlwZTogdHlwZSxcbiAgY29weTogY29weSxcbiAgaXNSZWZlcmVuY2VUeXBlOiBpc1JlZmVyZW5jZVR5cGUsXG4gIGlzQ29tbW9uS2V5VHlwZTogaXNDb21tb25LZXlUeXBlXG59OyIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9KU09ORGF0YVN0b3JlJyk7Il19
