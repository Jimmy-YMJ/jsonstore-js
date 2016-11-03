(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JSONStore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');

var splice = Array.prototype.splice;

var createArray = function createArray(length, infilling) {
  length = length || 0;
  var arr = [],
      i = 0;
  for (; i < length; i++) {
    arr.push(infilling === undefined ? null : infilling);
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

var spreadArray = function spreadArray(arr, begin, infilling) {
  var deleted = [];
  if (utils.type(arr) === 'array') {
    var infillingType = utils.type(infilling);
    if (infillingType === 'array') {
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

var spread2dArrayRow = function spread2dArrayRow(arr, begin, rows) {
  var deleted = [],
      rowsType = utils.type(rows);
  if (is2dArray(arr)) {
    var colCount = arr[0].length;
    if (rowsType === 'number') {
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

var spread2dArrayCol = function spread2dArrayCol(arr, begin, cols) {
  var deleted = [],
      deletedCol,
      colsType = utils.type(cols);
  if (is2dArray(arr)) {
    var rowCount = arr.length,
        i = 0;
    if (colsType === 'number') {
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
},{"./utils":4}],2:[function(_dereq_,module,exports){
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
    for (key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = utils.copy(source[key]);
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
},{"./utils":4}],3:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');
var array = _dereq_('./array');
var object = _dereq_('./object');

var patchTypes = {
  add: 'add',
  remove: 'remove',
  update: 'update',
  moveUp: 'moveUp',
  moveDown: 'moveDown',
  moveTo: 'moveTo',
  exchange: 'exchange',
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
  createSpreadArray: function createSpreadArray(path, begin, infilling) {
    return createPatch(patchTypes.spreadArray, arguments);
  },
  createSpread2dArrayRow: function createSpread2dArrayRow(path, begin, rows) {
    return createPatch(patchTypes.spread2dArrayRow, arguments);
  },
  createSpread2dArrayCol: function createSpread2dArrayCol(path, begin, cols) {
    return createPatch(patchTypes.spread2dArrayCol, arguments);
  }
};

function JSONDataStore(options) {
  options = options || {};
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
    var currentPath = this._formatPath(this.currentPath, false),
        fullPath = currentPath.concat(this._formatPath(path, false));
    return this._formatPath(fullPath);
  },
  _getRelativePath: function _getRelativePath(fullPath) {
    return fullPath.slice(this.currentPath.length);
  },
  goTo: function goTo(path, addUp) {
    if (!this.isDoing) {
      throw new Error('You are using store.goTo outside store.do!');
    }
    if (addUp === true) {
      this.currentPath = this.currentPath.concat(this._formatPath(path));
    } else {
      this.currentPath = this._formatPath(path);
    }
    return this;
  },
  do: function _do(callback) {
    var result = {};
    this.isDoing = true;
    callback(this);
    // compose result
    result.patches = this.patches;
    result.relativePatches = this.relativePatches;
    result.backPatches = this.backPatches;
    result.store = this;
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
        fullPath = this._formatPath(path);
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
    from = this._formatPath(from);
    to = this._formatPath(to);
    if (from && to) {
      var fromRef = this._getRef(from),
          toRef = this.get(to);
      this.update(from, toRef);
      this.update(to, fromRef);
    }
    return this;
  },
  spreadArray: function spreadArray(path, begin, infilling) {
    begin = begin || 0;
    var ref;
    if (!(path = this._formatPath(path)) || utils.type(ref = this._getRef(path)) !== 'array' || !(utils.type(begin) === 'number')) {
      return this;
    }
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpreadArray(path, begin, infilling));
      this.relativePatches.push(patchMethods.createSpreadArray(this._getRelativePath(path), begin, infilling));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spreadArray(ref, begin, infilling);
    return this;
  },
  spread2dArrayRow: function spread2dArrayRow(path, begin, rows) {
    begin = begin || 0;
    var ref;
    if (!(path = this._formatPath(path)) || !array.is2dArray(ref = this._getRef(path)) || !(utils.type(begin) === 'number')) {
      return this;
    }
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpread2dArrayRow(path, begin, rows));
      this.relativePatches.push(patchMethods.createSpread2dArrayRow(this._getRelativePath(path), begin, rows));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayRow(ref, begin, rows);
    return this;
  },
  spread2dArrayCol: function spread2dArrayCol(path, begin, cols) {
    begin = begin || 0;
    var ref;
    if (!(path = this._formatPath(path)) || !array.is2dArray(ref = this._getRef(path)) || !(utils.type(begin) === 'number')) {
      return this;
    }
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpread2dArrayCol(path, begin, cols));
      this.relativePatches.push(patchMethods.createSpread2dArrayCol(this._getRelativePath(path), begin, cols));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayCol(ref, begin, cols);
    return this;
  },
  get: function get(path, copy) {
    if (path = this._formatPath(path)) {
      return copy === false ? this._getRef(path) : utils.copy(this._getRef(path));
    }
  },
  patch: patchMethods,
  applyPatch: function applyPatch(patches) {
    patches = utils.type(patches) === 'array' ? patches : [patches];
    patches.forEach(function (patch) {
      this[patch.type].apply(this, patch.args);
    }.bind(this));
    return this;
  }
};

module.exports = JSONDataStore;
},{"./array":1,"./object":2,"./utils":4}],4:[function(_dereq_,module,exports){
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
},{}],5:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./lib/store');
},{"./lib/store":3}]},{},[5])(5)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy8uNi4wLjFAYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9zdG9yZS5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBzcGxpY2UgPSBBcnJheS5wcm90b3R5cGUuc3BsaWNlO1xuXG52YXIgY3JlYXRlQXJyYXkgPSBmdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgsIGluZmlsbGluZykge1xuICBsZW5ndGggPSBsZW5ndGggfHwgMDtcbiAgdmFyIGFyciA9IFtdLFxuICAgICAgaSA9IDA7XG4gIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBhcnIucHVzaChpbmZpbGxpbmcgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBpbmZpbGxpbmcpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG52YXIgaXMyZEFycmF5ID0gZnVuY3Rpb24gaXMyZEFycmF5KGFycikge1xuICB2YXIgaXMyZDtcbiAgaWYgKGlzMmQgPSB1dGlscy50eXBlKGFycikgPT09ICdhcnJheScgJiYgYXJyLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IGFyci5sZW5ndGg7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaXMyZCAmPSB1dGlscy50eXBlKGFycltpXSkgPT09ICdhcnJheSc7XG4gICAgICBpZiAoIWlzMmQpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGNyZWF0ZTJkQXJyYXkgPSBmdW5jdGlvbiBjcmVhdGUyZEFycmF5KHJvdywgY29sLCBpbmZpbGxpbmcpIHtcbiAgcm93ID0gcm93IHx8IDA7XG4gIGNvbCA9IGNvbCB8fCAwO1xuICB2YXIgYXJyID0gbmV3IEFycmF5KHJvdyksXG4gICAgICBpID0gMDtcbiAgZm9yICg7IGkgPCByb3c7IGkrKykge1xuICAgIGFycltpXSA9IGNyZWF0ZUFycmF5KGNvbCwgaW5maWxsaW5nKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudmFyIHBhcnNlQXJyYXlJbmRleCA9IGZ1bmN0aW9uIHBhcnNlQXJyYXlJbmRleChpbmRleCkge1xuICB2YXIgdHlwZSA9IHV0aWxzLnR5cGUoaW5kZXgpO1xuICBpZiAodHlwZSA9PT0gJ3N0cmluZycgfHwgdHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gcGFyc2VJbnQoaW5kZXgpO1xuICB9XG4gIHJldHVybiB2b2lkIDA7XG59O1xuXG52YXIgZ2V0QXJyYXlJbmRleEJ5VmFsdWUgPSBmdW5jdGlvbiBnZXRBcnJheUluZGV4QnlWYWx1ZShhcnIsIHZhbHVlKSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICB2YXIgdmFsdWVUeXBlID0gdXRpbHMudHlwZSh2YWx1ZSk7XG4gICAgaWYgKHZhbHVlVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICBsZW4gPSBhcnIubGVuZ3RoLFxuICAgICAgICAgIGl0ZW07XG4gICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBhcnJbaV07XG4gICAgICAgIHZhciBpc0VxdWFsID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpc0VxdWFsID0gaXRlbVtrZXldID09PSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgaWYgKCFpc0VxdWFsKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRXF1YWwpIHtcbiAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYXJyLmluZGV4T2YodmFsdWUpO1xuICAgIH1cbiAgfVxufTtcblxudmFyIG1vdmVBcnJheUl0ZW1VcCA9IGZ1bmN0aW9uIG1vdmVBcnJheUl0ZW1VcChhcnIsIGluZGV4KSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICBpbmRleCA9IHBhcnNlQXJyYXlJbmRleChpbmRleCk7XG4gICAgdmFyIGN1cnJJdGVtID0gYXJyW2luZGV4XTtcbiAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICBhcnJbaW5kZXhdID0gYXJyW2luZGV4IC0gMV07XG4gICAgICBhcnJbaW5kZXggLSAxXSA9IGN1cnJJdGVtO1xuICAgIH1cbiAgfVxufTtcblxudmFyIG1vdmVBcnJheUl0ZW1Eb3duID0gZnVuY3Rpb24gbW92ZUFycmF5SXRlbURvd24oYXJyLCBpbmRleCkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgaW5kZXggPSBwYXJzZUFycmF5SW5kZXgoaW5kZXgpO1xuICAgIHZhciBjdXJySXRlbSA9IGFycltpbmRleF07XG4gICAgaWYgKGluZGV4IDwgYXJyLmxlbmd0aCAtIDEpIHtcbiAgICAgIGFycltpbmRleF0gPSBhcnJbaW5kZXggKyAxXTtcbiAgICAgIGFycltpbmRleCArIDFdID0gY3Vyckl0ZW07XG4gICAgfVxuICB9XG59O1xuXG52YXIgc3ByZWFkQXJyYXkgPSBmdW5jdGlvbiBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCBpbmZpbGxpbmcpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXTtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIHZhciBpbmZpbGxpbmdUeXBlID0gdXRpbHMudHlwZShpbmZpbGxpbmcpO1xuICAgIGlmIChpbmZpbGxpbmdUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChpbmZpbGxpbmcpKTtcbiAgICB9IGVsc2UgaWYgKGluZmlsbGluZ1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAoaW5maWxsaW5nID4gMCkge1xuICAgICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChjcmVhdGVBcnJheShpbmZpbGxpbmcpKSk7XG4gICAgICB9IGVsc2UgaWYgKGluZmlsbGluZyA8IDApIHtcbiAgICAgICAgZGVsZXRlZCA9IHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgTWF0aC5hYnMoaW5maWxsaW5nKV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbnZhciBzcHJlYWQyZEFycmF5Um93ID0gZnVuY3Rpb24gc3ByZWFkMmRBcnJheVJvdyhhcnIsIGJlZ2luLCByb3dzKSB7XG4gIHZhciBkZWxldGVkID0gW10sXG4gICAgICByb3dzVHlwZSA9IHV0aWxzLnR5cGUocm93cyk7XG4gIGlmIChpczJkQXJyYXkoYXJyKSkge1xuICAgIHZhciBjb2xDb3VudCA9IGFyclswXS5sZW5ndGg7XG4gICAgaWYgKHJvd3NUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKHJvd3MgPiAwKSB7XG4gICAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGNyZWF0ZTJkQXJyYXkocm93cywgY29sQ291bnQpKTtcbiAgICAgIH0gZWxzZSBpZiAocm93cyA8IDApIHtcbiAgICAgICAgZGVsZXRlZCA9IHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIHJvd3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocm93c1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIHJvd3MpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbnZhciBzcHJlYWQyZEFycmF5Q29sID0gZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChhcnIsIGJlZ2luLCBjb2xzKSB7XG4gIHZhciBkZWxldGVkID0gW10sXG4gICAgICBkZWxldGVkQ29sLFxuICAgICAgY29sc1R5cGUgPSB1dGlscy50eXBlKGNvbHMpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgcm93Q291bnQgPSBhcnIubGVuZ3RoLFxuICAgICAgICBpID0gMDtcbiAgICBpZiAoY29sc1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgZGVsZXRlZENvbCA9IHNwcmVhZEFycmF5KGFycltpXSwgYmVnaW4sIGNvbHMpO1xuICAgICAgICBpZiAoZGVsZXRlZENvbC5sZW5ndGgpIHtcbiAgICAgICAgICBkZWxldGVkLnB1c2goZGVsZXRlZENvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbHNUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29sc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzMmRBcnJheTogaXMyZEFycmF5LFxuICBjcmVhdGVBcnJheTogY3JlYXRlQXJyYXksXG4gIGNyZWF0ZTJkQXJyYXk6IGNyZWF0ZTJkQXJyYXksXG4gIHBhcnNlQXJyYXlJbmRleDogcGFyc2VBcnJheUluZGV4LFxuICBnZXRBcnJheUluZGV4QnlWYWx1ZTogZ2V0QXJyYXlJbmRleEJ5VmFsdWUsXG4gIG1vdmVBcnJheUl0ZW1VcDogbW92ZUFycmF5SXRlbVVwLFxuICBtb3ZlQXJyYXlJdGVtRG93bjogbW92ZUFycmF5SXRlbURvd24sXG4gIHNwcmVhZEFycmF5OiBzcHJlYWRBcnJheSxcbiAgc3ByZWFkMmRBcnJheVJvdzogc3ByZWFkMmRBcnJheVJvdyxcbiAgc3ByZWFkMmRBcnJheUNvbDogc3ByZWFkMmRBcnJheUNvbFxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGdldE9iamVjdEtleUJ5VmFsdWUgPSBmdW5jdGlvbiBnZXRPYmplY3RLZXlCeVZhbHVlKG9iaiwgdmFsdWUpIHtcbiAgdmFyIG9iaktleSwgb2JqVmFsdWUsIHZhbHVlS2V5O1xuICBpZiAodXRpbHMudHlwZSh2YWx1ZSkgPT09ICdvYmplY3QnKSB7XG4gICAgb3V0ZXI6IGZvciAob2JqS2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShvYmpLZXkpICYmIHV0aWxzLnR5cGUob2JqVmFsdWUgPSBvYmpbb2JqS2V5XSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZvciAodmFsdWVLZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkodmFsdWVLZXkpICYmIHZhbHVlW3ZhbHVlS2V5XSAhPT0gb2JqVmFsdWVbdmFsdWVLZXldKSB7XG4gICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgb2JqW29iaktleV0gPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBvYmpLZXk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuICB2YXIgdGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuICAgICAgYXJnTGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmdMZW47IGkrKykge1xuICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV0sXG4gICAgICAgIGtleTtcbiAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICB0YXJnZXRba2V5XSA9IHV0aWxzLmNvcHkoc291cmNlW2tleV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGhhc093blByb3BlcnR5OiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgZ2V0T2JqZWN0S2V5QnlWYWx1ZTogZ2V0T2JqZWN0S2V5QnlWYWx1ZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcbnZhciBvYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xuXG52YXIgcGF0Y2hUeXBlcyA9IHtcbiAgYWRkOiAnYWRkJyxcbiAgcmVtb3ZlOiAncmVtb3ZlJyxcbiAgdXBkYXRlOiAndXBkYXRlJyxcbiAgbW92ZVVwOiAnbW92ZVVwJyxcbiAgbW92ZURvd246ICdtb3ZlRG93bicsXG4gIG1vdmVUbzogJ21vdmVUbycsXG4gIGV4Y2hhbmdlOiAnZXhjaGFuZ2UnLFxuICBzcHJlYWRBcnJheTogJ3NwcmVhZEFycmF5JyxcbiAgc3ByZWFkMmRBcnJheUNvbDogJ3NwcmVhZDJkQXJyYXlDb2wnLFxuICBzcHJlYWQyZEFycmF5Um93OiAnc3ByZWFkMmRBcnJheVJvdydcbn07XG5cbnZhciBjcmVhdGVQYXRjaCA9IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoKHR5cGUsIGFyZ3MpIHtcbiAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MpO1xuICByZXR1cm4gdXRpbHMuY29weSh7XG4gICAgdHlwZTogdHlwZSxcbiAgICBhcmdzOiBhcmdzXG4gIH0pO1xufTtcblxuLyoqXG4gKiBjcmVhdGUgcGF0Y2ggb3BlcmF0aW9uc1xuICogKi9cblxudmFyIHBhdGNoTWV0aG9kcyA9IHtcbiAgY3JlYXRlQWRkOiBmdW5jdGlvbiBjcmVhdGVBZGQocGF0aCwgdmFsdWUsIGtleSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmFkZCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlUmVtb3ZlOiBmdW5jdGlvbiBjcmVhdGVSZW1vdmUocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnJlbW92ZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlVXBkYXRlOiBmdW5jdGlvbiBjcmVhdGVVcGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMudXBkYXRlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVXA6IGZ1bmN0aW9uIGNyZWF0ZU1vdmVVcChwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVVwLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlRG93bjogZnVuY3Rpb24gY3JlYXRlTW92ZURvd24ocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLm1vdmVEb3duLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVG86IGZ1bmN0aW9uIGNyZWF0ZU1vdmVUbyhmcm9tLCB0bywga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVRvLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeGNoYW5nZTogZnVuY3Rpb24gY3JlYXRlRXhjaGFuZ2UoZnJvbSwgdG8pIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5leGNoYW5nZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkQXJyYXk6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWRBcnJheSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlSb3csIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWQyZEFycmF5Q29sLCBhcmd1bWVudHMpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBKU09ORGF0YVN0b3JlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzdG9yZSA9IG9wdGlvbnMuc3RvcmUsXG4gICAgICBjb3B5U3RvcmUgPSBvcHRpb25zLmNvcHlTdG9yZSAhPT0gZmFsc2U7XG4gIHRoaXMuc3RvcmUgPSBjb3B5U3RvcmUgPyB1dGlscy5jb3B5KHN0b3JlKSA6IHN0b3JlO1xuICAvLyAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgdGhpcy5wYXRjaGVzID0gW107XG4gIHRoaXMucmVsYXRpdmVQYXRjaGVzID0gW107XG4gIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgdGhpcy5jdXJyZW50UGF0aCA9IFtdO1xuICB0aGlzLmlzRG9pbmcgPSBmYWxzZTtcbn1cblxuSlNPTkRhdGFTdG9yZS5wcm90b3R5cGUgPSB7XG4gIF9nZXRSZWY6IGZ1bmN0aW9uIF9nZXRSZWYocGF0aCkge1xuICAgIHZhciByZWYgPSB0aGlzLnN0b3JlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgcmVmID0gcmVmW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gcmVmO1xuICB9LFxuICBfZGV0ZWN0UGF0aDogZnVuY3Rpb24gX2RldGVjdFBhdGgocGF0aCkge1xuICAgIHZhciBkZXRlY3RlZCA9IFtdLFxuICAgICAgICByZWYgPSB0aGlzLnN0b3JlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIGtleSxcbiAgICAgICAga2V5VHlwZSxcbiAgICAgICAgcmVmVHlwZTtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrZXkgPSBwYXRoW2ldO1xuICAgICAga2V5VHlwZSA9IHV0aWxzLnR5cGUoa2V5KTtcbiAgICAgIHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZik7XG4gICAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGtleSwgJ19fdmFsdWUnKSkge1xuICAgICAgICAgIHZhciBvYmpLZXkgPSBvYmplY3QuZ2V0T2JqZWN0S2V5QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAob2JqS2V5KSB7XG4gICAgICAgICAgICByZWYgPSByZWZbb2JqS2V5XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2gob2JqS2V5KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChyZWYsIGtleSkpIHtcbiAgICAgICAgICByZWYgPSByZWZba2V5XTtcbiAgICAgICAgICBkZXRlY3RlZC5wdXNoKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGtleSwgJ19fdmFsdWUnKSkge1xuICAgICAgICAgIHZhciBpbmRleCA9IGFycmF5LmdldEFycmF5SW5kZXhCeVZhbHVlKHJlZiwga2V5Ll9fdmFsdWUpO1xuICAgICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgICByZWYgPSByZWZbaW5kZXhdO1xuICAgICAgICAgICAgZGV0ZWN0ZWQucHVzaChpbmRleCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGV0ZWN0ZWQ7XG4gIH0sXG4gIF9mb3JtYXRQYXRoOiBmdW5jdGlvbiBfZm9ybWF0UGF0aChwYXRoLCBkZXRlY3QpIHtcbiAgICB2YXIgcGF0aFR5cGUgPSB1dGlscy50eXBlKHBhdGgpO1xuICAgIGlmIChwYXRoVHlwZSA9PT0gJ3VuZGVmaW5lZCcgfHwgcGF0aFR5cGUgPT09ICdudWxsJykge1xuICAgICAgcGF0aCA9IFtdO1xuICAgIH0gZWxzZSBpZiAocGF0aFR5cGUgIT09ICdhcnJheScpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfVxuICAgIGlmIChkZXRlY3QgIT09IGZhbHNlKSB7XG4gICAgICB2YXIgZGV0ZWN0ZWQgPSB0aGlzLl9kZXRlY3RQYXRoKHBhdGgpO1xuICAgICAgaWYgKGRldGVjdGVkLmxlbmd0aCA9PT0gcGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGRldGVjdGVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9LFxuICBfbW92ZUFycmF5SXRlbTogZnVuY3Rpb24gX21vdmVBcnJheUl0ZW0ocGF0aCwgbW92ZVVwKSB7XG4gICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFmdWxsUGF0aCB8fCBmdWxsUGF0aC5sZW5ndGggPCAxKSByZXR1cm4gdGhpcztcbiAgICB2YXIgaXRlbUluZGV4ID0gZnVsbFBhdGgucG9wKCksXG4gICAgICAgIGFyciA9IHRoaXMuX2dldFJlZihmdWxsUGF0aCk7XG4gICAgaWYgKHV0aWxzLnR5cGUoYXJyKSAhPT0gJ2FycmF5JykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIG1ldGhvZCA9IG1vdmVVcCA9PT0gdHJ1ZSA/ICdjcmVhdGVNb3ZlVXAnIDogJ2NyZWF0ZU1vdmVEb3duJyxcbiAgICAgICAgcmV2ZXJzZU1ldGhvZCA9IG1ldGhvZCA9PT0gJ2NyZWF0ZU1vdmVVcCcgPyAnY3JlYXRlTW92ZURvd24nIDogJ2NyZWF0ZU1vdmVVcCc7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0oZnVsbFBhdGguY29uY2F0KGl0ZW1JbmRleCkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0odGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSkpO1xuICAgICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSAmJiBpdGVtSW5kZXggPiAwIHx8IG1vdmVVcCAhPT0gdHJ1ZSAmJiBpdGVtSW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzW3JldmVyc2VNZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChtb3ZlVXAgPT09IHRydWUgPyBpdGVtSW5kZXggLSAxIDogaXRlbUluZGV4ICsgMSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSkge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbVVwKGFyciwgaXRlbUluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbURvd24oYXJyLCBpdGVtSW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgX2dldEZ1bGxQYXRoOiBmdW5jdGlvbiBfZ2V0RnVsbFBhdGgocGF0aCkge1xuICAgIHZhciBjdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodGhpcy5jdXJyZW50UGF0aCwgZmFsc2UpLFxuICAgICAgICBmdWxsUGF0aCA9IGN1cnJlbnRQYXRoLmNvbmNhdCh0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKSk7XG4gICAgcmV0dXJuIHRoaXMuX2Zvcm1hdFBhdGgoZnVsbFBhdGgpO1xuICB9LFxuICBfZ2V0UmVsYXRpdmVQYXRoOiBmdW5jdGlvbiBfZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSB7XG4gICAgcmV0dXJuIGZ1bGxQYXRoLnNsaWNlKHRoaXMuY3VycmVudFBhdGgubGVuZ3RoKTtcbiAgfSxcbiAgZ29UbzogZnVuY3Rpb24gZ29UbyhwYXRoLCBhZGRVcCkge1xuICAgIGlmICghdGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgdXNpbmcgc3RvcmUuZ29UbyBvdXRzaWRlIHN0b3JlLmRvIScpO1xuICAgIH1cbiAgICBpZiAoYWRkVXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLmN1cnJlbnRQYXRoLmNvbmNhdCh0aGlzLl9mb3JtYXRQYXRoKHBhdGgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkbzogZnVuY3Rpb24gX2RvKGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHRoaXMuaXNEb2luZyA9IHRydWU7XG4gICAgY2FsbGJhY2sodGhpcyk7XG4gICAgLy8gY29tcG9zZSByZXN1bHRcbiAgICByZXN1bHQucGF0Y2hlcyA9IHRoaXMucGF0Y2hlcztcbiAgICByZXN1bHQucmVsYXRpdmVQYXRjaGVzID0gdGhpcy5yZWxhdGl2ZVBhdGNoZXM7XG4gICAgcmVzdWx0LmJhY2tQYXRjaGVzID0gdGhpcy5iYWNrUGF0Y2hlcztcbiAgICByZXN1bHQuc3RvcmUgPSB0aGlzO1xuICAgIC8vIHJlc2V0ICdkbycgYWJvdXQgYXR0cmlidXRlc1xuICAgIHRoaXMucGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzID0gW107XG4gICAgdGhpcy5iYWNrUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSBbXTtcbiAgICB0aGlzLmlzRG9pbmcgPSBmYWxzZTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBhZGQ6IGZ1bmN0aW9uIGFkZChwYXRoLCB2YWx1ZSwga2V5KSB7XG4gICAgdmFyIHJlZiwgcmVmVHlwZTtcbiAgICBwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFwYXRoIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAocmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKSkgPT09ICdvYmplY3QnICYmICF1dGlscy5pc0NvbW1vbktleVR5cGUoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVBZGQocGF0aCwgdmFsdWUsIGtleSkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgdmFsdWUsIGtleSkpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHBhdGguY29uY2F0KGtleSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpLCB0cnVlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmVmW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluZGV4ID0gYXJyYXkucGFyc2VBcnJheUluZGV4KGtleSk7XG4gICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZWYuc3BsaWNlKGluZGV4LCAwLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWYucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShwYXRoKSB7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgIH1cbiAgICBpZiAocGF0aC5sZW5ndGggPCAxKSB7XG4gICAgICB0aGlzLnN0b3JlID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBsYXN0S2V5ID0gcGF0aC5wb3AoKSxcbiAgICAgICAgcmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpLFxuICAgICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICByZWYuc3BsaWNlKGxhc3RLZXksIDEpO1xuICAgIH0gZWxzZSBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGRlbGV0ZSByZWZbbGFzdEtleV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUpIHtcbiAgICBwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIGxhc3RLZXksXG4gICAgICAgIGZ1bGxQYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKTtcbiAgICBpZiAoZnVsbFBhdGgpIHtcbiAgICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShmdWxsUGF0aCwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aCksIHZhbHVlKSk7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB0aGlzLmdldChmdWxsUGF0aCkpKTtcbiAgICAgIH1cbiAgICAgIGxhc3RLZXkgPSBmdWxsUGF0aC5wb3AoKTtcbiAgICAgIGlmIChsYXN0S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fZ2V0UmVmKGZ1bGxQYXRoKVtsYXN0S2V5XSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdG9yZSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIGlmIChmb3JjZVVwZGF0ZSA9PT0gdHJ1ZSAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIGxhc3RLZXkgPSBwYXRoLnBvcCgpO1xuICAgICAgcmV0dXJuIHRoaXMuYWRkKHBhdGgsIHZhbHVlLCBsYXN0S2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIG1vdmVVcDogZnVuY3Rpb24gbW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoLCB0cnVlKTtcbiAgfSxcbiAgbW92ZURvd246IGZ1bmN0aW9uIG1vdmVEb3duKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoKTtcbiAgfSxcbiAgbW92ZVRvOiBmdW5jdGlvbiBtb3ZlVG8oZnJvbSwgdG8sIGtleSkge1xuICAgIGZyb20gPSB0aGlzLl9nZXRGdWxsUGF0aChmcm9tKTtcbiAgICB0byA9IHRoaXMuX2dldEZ1bGxQYXRoKHRvKTtcbiAgICBpZiAoIWZyb20gfHwgIXRvIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUodGhpcy5fZ2V0UmVmKHRvKSkpIHJldHVybiB0aGlzO1xuICAgIHRoaXMuYWRkKHRvLCB0aGlzLl9nZXRSZWYoZnJvbSksIGtleSk7XG4gICAgdGhpcy5yZW1vdmUoZnJvbSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGV4Y2hhbmdlOiBmdW5jdGlvbiBleGNoYW5nZShmcm9tLCB0bykge1xuICAgIGZyb20gPSB0aGlzLl9mb3JtYXRQYXRoKGZyb20pO1xuICAgIHRvID0gdGhpcy5fZm9ybWF0UGF0aCh0byk7XG4gICAgaWYgKGZyb20gJiYgdG8pIHtcbiAgICAgIHZhciBmcm9tUmVmID0gdGhpcy5fZ2V0UmVmKGZyb20pLFxuICAgICAgICAgIHRvUmVmID0gdGhpcy5nZXQodG8pO1xuICAgICAgdGhpcy51cGRhdGUoZnJvbSwgdG9SZWYpO1xuICAgICAgdGhpcy51cGRhdGUodG8sIGZyb21SZWYpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkQXJyYXk6IGZ1bmN0aW9uIHNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcpIHtcbiAgICBiZWdpbiA9IGJlZ2luIHx8IDA7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKSkgfHwgdXRpbHMudHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpICE9PSAnYXJyYXknIHx8ICEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWRBcnJheSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGJlZ2luLCBpbmZpbGxpbmcpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZEFycmF5KHJlZiwgYmVnaW4sIGluZmlsbGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlSb3c6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MpIHtcbiAgICBiZWdpbiA9IGJlZ2luIHx8IDA7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKSkgfHwgIWFycmF5LmlzMmRBcnJheShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8ICEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIHJvd3MpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlSb3cocmVmLCBiZWdpbiwgcm93cyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMpIHtcbiAgICBiZWdpbiA9IGJlZ2luIHx8IDA7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKSkgfHwgIWFycmF5LmlzMmRBcnJheShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8ICEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGNvbHMpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlDb2wocmVmLCBiZWdpbiwgY29scyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24gZ2V0KHBhdGgsIGNvcHkpIHtcbiAgICBpZiAocGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCkpIHtcbiAgICAgIHJldHVybiBjb3B5ID09PSBmYWxzZSA/IHRoaXMuX2dldFJlZihwYXRoKSA6IHV0aWxzLmNvcHkodGhpcy5fZ2V0UmVmKHBhdGgpKTtcbiAgICB9XG4gIH0sXG4gIHBhdGNoOiBwYXRjaE1ldGhvZHMsXG4gIGFwcGx5UGF0Y2g6IGZ1bmN0aW9uIGFwcGx5UGF0Y2gocGF0Y2hlcykge1xuICAgIHBhdGNoZXMgPSB1dGlscy50eXBlKHBhdGNoZXMpID09PSAnYXJyYXknID8gcGF0Y2hlcyA6IFtwYXRjaGVzXTtcbiAgICBwYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICB0aGlzW3BhdGNoLnR5cGVdLmFwcGx5KHRoaXMsIHBhdGNoLmFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSlNPTkRhdGFTdG9yZTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciByZWZlcmVuY2VUeXBlcyA9IHtcbiAgJ2FycmF5JzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWVcbn07XG5cbnZhciBjb21tb25LZXlUeXBlcyA9IHtcbiAgJ3N0cmluZyc6IHRydWUsXG4gICdudW1iZXInOiB0cnVlXG59O1xuXG52YXIgdHlwZSA9IGZ1bmN0aW9uIHR5cGUoZGF0YSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGEpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xufTtcblxudmFyIGlzUmVmZXJlbmNlVHlwZSA9IGZ1bmN0aW9uIGlzUmVmZXJlbmNlVHlwZShkYXRhKSB7XG4gIHJldHVybiByZWZlcmVuY2VUeXBlc1t0eXBlKGRhdGEpXSB8fCBmYWxzZTtcbn07XG5cbnZhciBpc0NvbW1vbktleVR5cGUgPSBmdW5jdGlvbiBpc0NvbW1vbktleVR5cGUoa2V5KSB7XG4gIHJldHVybiBjb21tb25LZXlUeXBlc1t0eXBlKGtleSldIHx8IGZhbHNlO1xufTtcblxudmFyIGNvcHkgPSBmdW5jdGlvbiBjb3B5KGRhdGEpIHtcbiAgcmV0dXJuIGlzUmVmZXJlbmNlVHlwZShkYXRhKSA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpIDogZGF0YTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0eXBlOiB0eXBlLFxuICBjb3B5OiBjb3B5LFxuICBpc1JlZmVyZW5jZVR5cGU6IGlzUmVmZXJlbmNlVHlwZSxcbiAgaXNDb21tb25LZXlUeXBlOiBpc0NvbW1vbktleVR5cGVcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL3N0b3JlJyk7Il19
