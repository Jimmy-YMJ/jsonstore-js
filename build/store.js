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
    var currentPath = this._formatPath(this.currentPath, false),
        fullPath = currentPath.concat(this._formatPath(path, false));
    return this._formatPath(fullPath);
  },
  _getRelativePath: function _getRelativePath(fullPath) {
    return fullPath.slice(this.currentPath.length);
  },
  reInit: function reInit() {
    JSONDataStore.call(this, this.initialOptions);
  },
  goTo: function goTo(path, addUp) {
    if (!this.isDoing) {
      throw new Error('You are using store.goTo outside store.do!');
    }
    if (addUp === true) {
      this.currentPath = this._formatPath(this.currentPath.concat(this._formatPath(path, false)));
    } else {
      this.currentPath = this._formatPath(path);
    }
    return this;
  },
  do: function _do(name, action, data) {
    if (typeof name === 'function') {
      data = action;
      action = name;
      name = '';
    }
    var result = {};
    this.isDoing = true;
    action(this, data, name);
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
  extendObject: function extendObject(path, a, b, c, d, e) {
    var ref;
    if (!(path = this._formatPath(path)) || utils.type(ref = this._getRef(path)) !== 'object') return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createExtendObject.apply(this, arguments));
      this.relativePatches.push(patchMethods.createExtendObject(this._getRelativePath(path), a, b, c, d, e));
      this.backPatches.push(patchMethods.createUpdate(path, this.get(path)));
    }
    object.extend(ref, a, b, c, d, e);
    return this;
  },
  spreadArray: function spreadArray(path, begin, infilling) {
    var ref;
    if (!(path = this._formatPath(path)) || utils.type(ref = this._getRef(path)) !== 'array') {
      return this;
    }
    begin = begin || ref.length;
    if (!(utils.type(begin) === 'number')) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpreadArray(path, begin, infilling));
      this.relativePatches.push(patchMethods.createSpreadArray(this._getRelativePath(path), begin, infilling));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spreadArray(ref, begin, infilling);
    return this;
  },
  spread2dArrayRow: function spread2dArrayRow(path, begin, rows) {
    var ref;
    if (!(path = this._formatPath(path)) || !array.is2dArray(ref = this._getRef(path)) || !(utils.type(begin) === 'number')) {
      return this;
    }
    begin = begin || ref.length;
    if (!(utils.type(begin) === 'number')) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpread2dArrayRow(path, begin, rows));
      this.relativePatches.push(patchMethods.createSpread2dArrayRow(this._getRelativePath(path), begin, rows));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayRow(ref, begin, rows);
    return this;
  },
  spread2dArrayCol: function spread2dArrayCol(path, begin, cols) {
    var ref;
    if (!(path = this._formatPath(path)) || !array.is2dArray(ref = this._getRef(path)) || !(utils.type(begin) === 'number')) {
      return this;
    }
    begin = begin || ref.length;
    if (!(utils.type(begin) === 'number')) return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createSpread2dArrayCol(path, begin, cols));
      this.relativePatches.push(patchMethods.createSpread2dArrayCol(this._getRelativePath(path), begin, cols));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayCol(ref, begin, cols);
    return this;
  },
  get: function get(path, copy) {
    if (path = this._getFullPath(path)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy8uNi4wLjFAYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9zdG9yZS5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHNwbGljZSA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2U7XG5cbnZhciBjcmVhdGVBcnJheSA9IGZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCwgaW5maWxsaW5nKSB7XG4gIGxlbmd0aCA9IGxlbmd0aCB8fCAwO1xuICB2YXIgYXJyID0gW10sXG4gICAgICBpID0gMDtcbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGFyci5wdXNoKGluZmlsbGluZyA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGluZmlsbGluZyk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBpczJkQXJyYXkgPSBmdW5jdGlvbiBpczJkQXJyYXkoYXJyKSB7XG4gIHZhciBpczJkO1xuICBpZiAoaXMyZCA9IHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5JyAmJiBhcnIubGVuZ3RoID4gMCkge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gYXJyLmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpczJkICY9IHV0aWxzLnR5cGUoYXJyW2ldKSA9PT0gJ2FycmF5JztcbiAgICAgIGlmICghaXMyZCkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY3JlYXRlMmRBcnJheSA9IGZ1bmN0aW9uIGNyZWF0ZTJkQXJyYXkocm93LCBjb2wsIGluZmlsbGluZykge1xuICByb3cgPSByb3cgfHwgMDtcbiAgY29sID0gY29sIHx8IDA7XG4gIHZhciBhcnIgPSBuZXcgQXJyYXkocm93KSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IHJvdzsgaSsrKSB7XG4gICAgYXJyW2ldID0gY3JlYXRlQXJyYXkoY29sLCBpbmZpbGxpbmcpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG52YXIgcGFyc2VBcnJheUluZGV4ID0gZnVuY3Rpb24gcGFyc2VBcnJheUluZGV4KGluZGV4KSB7XG4gIHZhciB0eXBlID0gdXRpbHMudHlwZShpbmRleCk7XG4gIGlmICh0eXBlID09PSAnc3RyaW5nJyB8fCB0eXBlID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBwYXJzZUludChpbmRleCk7XG4gIH1cbiAgcmV0dXJuIHZvaWQgMDtcbn07XG5cbnZhciBnZXRBcnJheUluZGV4QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldEFycmF5SW5kZXhCeVZhbHVlKGFyciwgdmFsdWUpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIHZhciB2YWx1ZVR5cGUgPSB1dGlscy50eXBlKHZhbHVlKTtcbiAgICBpZiAodmFsdWVUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgIGxlbiA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgaXRlbTtcbiAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGFycltpXTtcbiAgICAgICAgdmFyIGlzRXF1YWwgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlzRXF1YWwgPSBpdGVtW2tleV0gPT09IHZhbHVlW2tleV07XG4gICAgICAgICAgICBpZiAoIWlzRXF1YWwpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNFcXVhbCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBhcnIuaW5kZXhPZih2YWx1ZSk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgbW92ZUFycmF5SXRlbVVwID0gZnVuY3Rpb24gbW92ZUFycmF5SXRlbVVwKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgIGFycltpbmRleF0gPSBhcnJbaW5kZXggLSAxXTtcbiAgICAgIGFycltpbmRleCAtIDFdID0gY3Vyckl0ZW07XG4gICAgfVxuICB9XG59O1xuXG52YXIgbW92ZUFycmF5SXRlbURvd24gPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtRG93bihhcnIsIGluZGV4KSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICBpbmRleCA9IHBhcnNlQXJyYXlJbmRleChpbmRleCk7XG4gICAgdmFyIGN1cnJJdGVtID0gYXJyW2luZGV4XTtcbiAgICBpZiAoaW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCArIDFdO1xuICAgICAgYXJyW2luZGV4ICsgMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBzcHJlYWRBcnJheSA9IGZ1bmN0aW9uIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGluZmlsbGluZykge1xuICB2YXIgZGVsZXRlZCA9IFtdO1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIGluZmlsbGluZ1R5cGUgPSB1dGlscy50eXBlKGluZmlsbGluZyk7XG4gICAgaWYgKGluZmlsbGluZ1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGluZmlsbGluZykpO1xuICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGlmIChpbmZpbGxpbmcgPiAwKSB7XG4gICAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGNyZWF0ZUFycmF5KGluZmlsbGluZykpKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCBNYXRoLmFicyhpbmZpbGxpbmcpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlSb3cgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Um93KGFyciwgYmVnaW4sIHJvd3MpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIHJvd3NUeXBlID0gdXRpbHMudHlwZShyb3dzKTtcbiAgaWYgKGlzMmRBcnJheShhcnIpKSB7XG4gICAgdmFyIGNvbENvdW50ID0gYXJyWzBdLmxlbmd0aDtcbiAgICBpZiAocm93c1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAocm93cyA+IDApIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgY3JlYXRlMmRBcnJheShyb3dzLCBjb2xDb3VudCkpO1xuICAgICAgfSBlbHNlIGlmIChyb3dzIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyb3dzVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlDb2wgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Q29sKGFyciwgYmVnaW4sIGNvbHMpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIGRlbGV0ZWRDb2wsXG4gICAgICBjb2xzVHlwZSA9IHV0aWxzLnR5cGUoY29scyk7XG4gIGlmIChpczJkQXJyYXkoYXJyKSkge1xuICAgIHZhciByb3dDb3VudCA9IGFyci5sZW5ndGgsXG4gICAgICAgIGkgPSAwO1xuICAgIGlmIChjb2xzVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBkZWxldGVkQ29sID0gc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29scyk7XG4gICAgICAgIGlmIChkZWxldGVkQ29sLmxlbmd0aCkge1xuICAgICAgICAgIGRlbGV0ZWQucHVzaChkZWxldGVkQ29sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sc1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXMyZEFycmF5OiBpczJkQXJyYXksXG4gIGNyZWF0ZUFycmF5OiBjcmVhdGVBcnJheSxcbiAgY3JlYXRlMmRBcnJheTogY3JlYXRlMmRBcnJheSxcbiAgcGFyc2VBcnJheUluZGV4OiBwYXJzZUFycmF5SW5kZXgsXG4gIGdldEFycmF5SW5kZXhCeVZhbHVlOiBnZXRBcnJheUluZGV4QnlWYWx1ZSxcbiAgbW92ZUFycmF5SXRlbVVwOiBtb3ZlQXJyYXlJdGVtVXAsXG4gIG1vdmVBcnJheUl0ZW1Eb3duOiBtb3ZlQXJyYXlJdGVtRG93bixcbiAgc3ByZWFkQXJyYXk6IHNwcmVhZEFycmF5LFxuICBzcHJlYWQyZEFycmF5Um93OiBzcHJlYWQyZEFycmF5Um93LFxuICBzcHJlYWQyZEFycmF5Q29sOiBzcHJlYWQyZEFycmF5Q29sXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZ2V0T2JqZWN0S2V5QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldE9iamVjdEtleUJ5VmFsdWUob2JqLCB2YWx1ZSkge1xuICB2YXIgb2JqS2V5LCBvYmpWYWx1ZSwgdmFsdWVLZXk7XG4gIGlmICh1dGlscy50eXBlKHZhbHVlKSA9PT0gJ29iamVjdCcpIHtcbiAgICBvdXRlcjogZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgdXRpbHMudHlwZShvYmpWYWx1ZSA9IG9ialtvYmpLZXldKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YWx1ZUtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eSh2YWx1ZUtleSkgJiYgdmFsdWVbdmFsdWVLZXldICE9PSBvYmpWYWx1ZVt2YWx1ZUtleV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqS2V5O1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKG9iaktleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkob2JqS2V5KSAmJiBvYmpbb2JqS2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG4gIHZhciB0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG4gICAgICBhcmdMZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ0xlbjsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSxcbiAgICAgICAga2V5O1xuICAgIGlmICh1dGlscy50eXBlKHNvdXJjZSkgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB1dGlscy5jb3B5KHNvdXJjZVtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGhhc093blByb3BlcnR5OiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgZ2V0T2JqZWN0S2V5QnlWYWx1ZTogZ2V0T2JqZWN0S2V5QnlWYWx1ZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcbnZhciBvYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xuXG52YXIgcGF0Y2hUeXBlcyA9IHtcbiAgYWRkOiAnYWRkJyxcbiAgcmVtb3ZlOiAncmVtb3ZlJyxcbiAgdXBkYXRlOiAndXBkYXRlJyxcbiAgbW92ZVVwOiAnbW92ZVVwJyxcbiAgbW92ZURvd246ICdtb3ZlRG93bicsXG4gIG1vdmVUbzogJ21vdmVUbycsXG4gIGV4Y2hhbmdlOiAnZXhjaGFuZ2UnLFxuICBleHRlbmRPYmplY3Q6ICdleHRlbmRPYmplY3QnLFxuICBzcHJlYWRBcnJheTogJ3NwcmVhZEFycmF5JyxcbiAgc3ByZWFkMmRBcnJheUNvbDogJ3NwcmVhZDJkQXJyYXlDb2wnLFxuICBzcHJlYWQyZEFycmF5Um93OiAnc3ByZWFkMmRBcnJheVJvdydcbn07XG5cbnZhciBjcmVhdGVQYXRjaCA9IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoKHR5cGUsIGFyZ3MpIHtcbiAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MpO1xuICByZXR1cm4gdXRpbHMuY29weSh7XG4gICAgdHlwZTogdHlwZSxcbiAgICBhcmdzOiBhcmdzXG4gIH0pO1xufTtcblxuLyoqXG4gKiBjcmVhdGUgcGF0Y2ggb3BlcmF0aW9uc1xuICogKi9cblxudmFyIHBhdGNoTWV0aG9kcyA9IHtcbiAgY3JlYXRlQWRkOiBmdW5jdGlvbiBjcmVhdGVBZGQocGF0aCwgdmFsdWUsIGtleSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmFkZCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlUmVtb3ZlOiBmdW5jdGlvbiBjcmVhdGVSZW1vdmUocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnJlbW92ZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlVXBkYXRlOiBmdW5jdGlvbiBjcmVhdGVVcGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMudXBkYXRlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVXA6IGZ1bmN0aW9uIGNyZWF0ZU1vdmVVcChwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVVwLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlRG93bjogZnVuY3Rpb24gY3JlYXRlTW92ZURvd24ocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLm1vdmVEb3duLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVG86IGZ1bmN0aW9uIGNyZWF0ZU1vdmVUbyhmcm9tLCB0bywga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVRvLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeGNoYW5nZTogZnVuY3Rpb24gY3JlYXRlRXhjaGFuZ2UoZnJvbSwgdG8pIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5leGNoYW5nZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlRXh0ZW5kT2JqZWN0OiBmdW5jdGlvbiBjcmVhdGVFeHRlbmRPYmplY3QocGF0aCwgYSwgYiwgYywgZCwgZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4dGVuZE9iamVjdCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkQXJyYXk6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWRBcnJheSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlSb3csIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWQyZEFycmF5Q29sLCBhcmd1bWVudHMpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBKU09ORGF0YVN0b3JlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMuaW5pdGlhbE9wdGlvbnMgPSB1dGlscy5jb3B5KG9wdGlvbnMpO1xuICB2YXIgc3RvcmUgPSBvcHRpb25zLnN0b3JlLFxuICAgICAgY29weVN0b3JlID0gb3B0aW9ucy5jb3B5U3RvcmUgIT09IGZhbHNlO1xuICB0aGlzLnN0b3JlID0gY29weVN0b3JlID8gdXRpbHMuY29weShzdG9yZSkgOiBzdG9yZTtcbiAgLy8gJ2RvJyBhYm91dCBhdHRyaWJ1dGVzXG4gIHRoaXMucGF0Y2hlcyA9IFtdO1xuICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICB0aGlzLmJhY2tQYXRjaGVzID0gW107XG4gIHRoaXMuY3VycmVudFBhdGggPSBbXTtcbiAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG59XG5cbkpTT05EYXRhU3RvcmUucHJvdG90eXBlID0ge1xuICBfZ2V0UmVmOiBmdW5jdGlvbiBfZ2V0UmVmKHBhdGgpIHtcbiAgICB2YXIgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHJlZiA9IHJlZltwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZjtcbiAgfSxcbiAgX2RldGVjdFBhdGg6IGZ1bmN0aW9uIF9kZXRlY3RQYXRoKHBhdGgpIHtcbiAgICB2YXIgZGV0ZWN0ZWQgPSBbXSxcbiAgICAgICAgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBrZXksXG4gICAgICAgIGtleVR5cGUsXG4gICAgICAgIHJlZlR5cGU7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcGF0aFtpXTtcbiAgICAgIGtleVR5cGUgPSB1dGlscy50eXBlKGtleSk7XG4gICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgb2JqS2V5ID0gb2JqZWN0LmdldE9iamVjdEtleUJ5VmFsdWUocmVmLCBrZXkuX192YWx1ZSk7XG4gICAgICAgICAgaWYgKG9iaktleSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW29iaktleV07XG4gICAgICAgICAgICBkZXRlY3RlZC5wdXNoKG9iaktleSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5nZXRBcnJheUluZGV4QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW2luZGV4XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2goaW5kZXgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlZiwga2V5KSkge1xuICAgICAgICAgIHJlZiA9IHJlZltrZXldO1xuICAgICAgICAgIGRldGVjdGVkLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRldGVjdGVkO1xuICB9LFxuICBfZm9ybWF0UGF0aDogZnVuY3Rpb24gX2Zvcm1hdFBhdGgocGF0aCwgZGV0ZWN0KSB7XG4gICAgdmFyIHBhdGhUeXBlID0gdXRpbHMudHlwZShwYXRoKTtcbiAgICBpZiAocGF0aFR5cGUgPT09ICd1bmRlZmluZWQnIHx8IHBhdGhUeXBlID09PSAnbnVsbCcpIHtcbiAgICAgIHBhdGggPSBbXTtcbiAgICB9IGVsc2UgaWYgKHBhdGhUeXBlICE9PSAnYXJyYXknKSB7XG4gICAgICBwYXRoID0gW3BhdGhdO1xuICAgIH1cbiAgICBpZiAoZGV0ZWN0ICE9PSBmYWxzZSkge1xuICAgICAgdmFyIGRldGVjdGVkID0gdGhpcy5fZGV0ZWN0UGF0aChwYXRoKTtcbiAgICAgIGlmIChkZXRlY3RlZC5sZW5ndGggPT09IHBhdGgubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBkZXRlY3RlZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfSxcbiAgX21vdmVBcnJheUl0ZW06IGZ1bmN0aW9uIF9tb3ZlQXJyYXlJdGVtKHBhdGgsIG1vdmVVcCkge1xuICAgIHZhciBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghZnVsbFBhdGggfHwgZnVsbFBhdGgubGVuZ3RoIDwgMSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGl0ZW1JbmRleCA9IGZ1bGxQYXRoLnBvcCgpLFxuICAgICAgICBhcnIgPSB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpO1xuICAgIGlmICh1dGlscy50eXBlKGFycikgIT09ICdhcnJheScpIHJldHVybiB0aGlzO1xuICAgIHZhciBtZXRob2QgPSBtb3ZlVXAgPT09IHRydWUgPyAnY3JlYXRlTW92ZVVwJyA6ICdjcmVhdGVNb3ZlRG93bicsXG4gICAgICAgIHJldmVyc2VNZXRob2QgPSBtZXRob2QgPT09ICdjcmVhdGVNb3ZlVXAnID8gJ2NyZWF0ZU1vdmVEb3duJyA6ICdjcmVhdGVNb3ZlVXAnO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kc1ttZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kc1ttZXRob2RdKHRoaXMuX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aC5jb25jYXQoaXRlbUluZGV4KSkpKTtcbiAgICAgIGlmIChtb3ZlVXAgPT09IHRydWUgJiYgaXRlbUluZGV4ID4gMCB8fCBtb3ZlVXAgIT09IHRydWUgJiYgaXRlbUluZGV4IDwgYXJyLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kc1tyZXZlcnNlTWV0aG9kXShmdWxsUGF0aC5jb25jYXQobW92ZVVwID09PSB0cnVlID8gaXRlbUluZGV4IC0gMSA6IGl0ZW1JbmRleCArIDEpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtb3ZlVXAgPT09IHRydWUpIHtcbiAgICAgIGFycmF5Lm1vdmVBcnJheUl0ZW1VcChhcnIsIGl0ZW1JbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFycmF5Lm1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaXRlbUluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9nZXRGdWxsUGF0aDogZnVuY3Rpb24gX2dldEZ1bGxQYXRoKHBhdGgpIHtcbiAgICB2YXIgY3VycmVudFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRoaXMuY3VycmVudFBhdGgsIGZhbHNlKSxcbiAgICAgICAgZnVsbFBhdGggPSBjdXJyZW50UGF0aC5jb25jYXQodGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSkpO1xuICAgIHJldHVybiB0aGlzLl9mb3JtYXRQYXRoKGZ1bGxQYXRoKTtcbiAgfSxcbiAgX2dldFJlbGF0aXZlUGF0aDogZnVuY3Rpb24gX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aCkge1xuICAgIHJldHVybiBmdWxsUGF0aC5zbGljZSh0aGlzLmN1cnJlbnRQYXRoLmxlbmd0aCk7XG4gIH0sXG4gIHJlSW5pdDogZnVuY3Rpb24gcmVJbml0KCkge1xuICAgIEpTT05EYXRhU3RvcmUuY2FsbCh0aGlzLCB0aGlzLmluaXRpYWxPcHRpb25zKTtcbiAgfSxcbiAgZ29UbzogZnVuY3Rpb24gZ29UbyhwYXRoLCBhZGRVcCkge1xuICAgIGlmICghdGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgdXNpbmcgc3RvcmUuZ29UbyBvdXRzaWRlIHN0b3JlLmRvIScpO1xuICAgIH1cbiAgICBpZiAoYWRkVXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRoaXMuY3VycmVudFBhdGguY29uY2F0KHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZG86IGZ1bmN0aW9uIF9kbyhuYW1lLCBhY3Rpb24sIGRhdGEpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRhdGEgPSBhY3Rpb247XG4gICAgICBhY3Rpb24gPSBuYW1lO1xuICAgICAgbmFtZSA9ICcnO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdGhpcy5pc0RvaW5nID0gdHJ1ZTtcbiAgICBhY3Rpb24odGhpcywgZGF0YSwgbmFtZSk7XG4gICAgLy8gY29tcG9zZSByZXN1bHRcbiAgICByZXN1bHQucGF0Y2hlcyA9IHRoaXMucGF0Y2hlcztcbiAgICByZXN1bHQucmVsYXRpdmVQYXRjaGVzID0gdGhpcy5yZWxhdGl2ZVBhdGNoZXM7XG4gICAgcmVzdWx0LmJhY2tQYXRjaGVzID0gdGhpcy5iYWNrUGF0Y2hlcztcbiAgICAvLyByZXNldCAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gICAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgYWRkOiBmdW5jdGlvbiBhZGQocGF0aCwgdmFsdWUsIGtleSkge1xuICAgIHZhciByZWYsIHJlZlR5cGU7XG4gICAgcGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghcGF0aCB8fCAhdXRpbHMuaXNSZWZlcmVuY2VUeXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgKHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZikpID09PSAnb2JqZWN0JyAmJiAhdXRpbHMuaXNDb21tb25LZXlUeXBlKGtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUFkZCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIHZhbHVlLCBrZXkpKTtcbiAgICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoLmNvbmNhdChrZXkpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlZltrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5LnBhcnNlQXJyYXlJbmRleChrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmLnNwbGljZShpbmRleCwgMCwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVmLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUocGF0aCkge1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUocGF0aCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCksIHRydWUpKTtcbiAgICB9XG4gICAgaWYgKHBhdGgubGVuZ3RoIDwgMSkge1xuICAgICAgdGhpcy5zdG9yZSA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbGFzdEtleSA9IHBhdGgucG9wKCksXG4gICAgICAgIHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSxcbiAgICAgICAgcmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKTtcbiAgICBpZiAocmVmVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgcmVmLnNwbGljZShsYXN0S2V5LCAxKTtcbiAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBkZWxldGUgcmVmW2xhc3RLZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlKSB7XG4gICAgcGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciBsYXN0S2V5LFxuICAgICAgICBmdWxsUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgaWYgKGZ1bGxQYXRoKSB7XG4gICAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUoZnVsbFBhdGgsIHZhbHVlKSk7XG4gICAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgoZnVsbFBhdGgpLCB2YWx1ZSkpO1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShmdWxsUGF0aCwgdGhpcy5nZXQoZnVsbFBhdGgpKSk7XG4gICAgICB9XG4gICAgICBsYXN0S2V5ID0gZnVsbFBhdGgucG9wKCk7XG4gICAgICBpZiAobGFzdEtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2dldFJlZihmdWxsUGF0aClbbGFzdEtleV0gPSB2YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc3RvcmUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSBpZiAoZm9yY2VVcGRhdGUgPT09IHRydWUgJiYgcGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBsYXN0S2V5ID0gcGF0aC5wb3AoKTtcbiAgICAgIHJldHVybiB0aGlzLmFkZChwYXRoLCB2YWx1ZSwgbGFzdEtleSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uIHNldChwYXRoLCB2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gIH0sXG4gIG1vdmVVcDogZnVuY3Rpb24gbW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoLCB0cnVlKTtcbiAgfSxcbiAgbW92ZURvd246IGZ1bmN0aW9uIG1vdmVEb3duKHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoKTtcbiAgfSxcbiAgbW92ZVRvOiBmdW5jdGlvbiBtb3ZlVG8oZnJvbSwgdG8sIGtleSkge1xuICAgIGZyb20gPSB0aGlzLl9nZXRGdWxsUGF0aChmcm9tKTtcbiAgICB0byA9IHRoaXMuX2dldEZ1bGxQYXRoKHRvKTtcbiAgICBpZiAoIWZyb20gfHwgIXRvIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUodGhpcy5fZ2V0UmVmKHRvKSkpIHJldHVybiB0aGlzO1xuICAgIHRoaXMuYWRkKHRvLCB0aGlzLl9nZXRSZWYoZnJvbSksIGtleSk7XG4gICAgdGhpcy5yZW1vdmUoZnJvbSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGV4Y2hhbmdlOiBmdW5jdGlvbiBleGNoYW5nZShmcm9tLCB0bykge1xuICAgIGZyb20gPSB0aGlzLl9mb3JtYXRQYXRoKGZyb20pO1xuICAgIHRvID0gdGhpcy5fZm9ybWF0UGF0aCh0byk7XG4gICAgaWYgKGZyb20gJiYgdG8pIHtcbiAgICAgIHZhciBmcm9tUmVmID0gdGhpcy5fZ2V0UmVmKGZyb20pLFxuICAgICAgICAgIHRvUmVmID0gdGhpcy5nZXQodG8pO1xuICAgICAgdGhpcy51cGRhdGUoZnJvbSwgdG9SZWYpO1xuICAgICAgdGhpcy51cGRhdGUodG8sIGZyb21SZWYpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZXh0ZW5kT2JqZWN0OiBmdW5jdGlvbiBleHRlbmRPYmplY3QocGF0aCwgYSwgYiwgYywgZCwgZSkge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ29iamVjdCcpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBhLCBiLCBjLCBkLCBlKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBvYmplY3QuZXh0ZW5kKHJlZiwgYSwgYiwgYywgZCwgZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZEFycmF5OiBmdW5jdGlvbiBzcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nKSB7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKSkgfHwgdXRpbHMudHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpICE9PSAnYXJyYXknKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSBiZWdpbiB8fCByZWYubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWRBcnJheSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGJlZ2luLCBpbmZpbGxpbmcpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZEFycmF5KHJlZiwgYmVnaW4sIGluZmlsbGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlSb3c6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MpIHtcbiAgICB2YXIgcmVmO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSBiZWdpbiB8fCByZWYubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIHJvd3MpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlSb3cocmVmLCBiZWdpbiwgcm93cyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMpIHtcbiAgICB2YXIgcmVmO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSBiZWdpbiB8fCByZWYubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGNvbHMpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlDb2wocmVmLCBiZWdpbiwgY29scyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24gZ2V0KHBhdGgsIGNvcHkpIHtcbiAgICBpZiAocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB7XG4gICAgICByZXR1cm4gY29weSA9PT0gZmFsc2UgPyB0aGlzLl9nZXRSZWYocGF0aCkgOiB1dGlscy5jb3B5KHRoaXMuX2dldFJlZihwYXRoKSk7XG4gICAgfVxuICB9LFxuICBwYXRjaDogcGF0Y2hNZXRob2RzLFxuICBhcHBseVBhdGNoOiBmdW5jdGlvbiBhcHBseVBhdGNoKHBhdGNoZXMpIHtcbiAgICBwYXRjaGVzID0gdXRpbHMudHlwZShwYXRjaGVzKSA9PT0gJ2FycmF5JyA/IHBhdGNoZXMgOiBbcGF0Y2hlc107XG4gICAgcGF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRjaCkge1xuICAgICAgdGhpc1twYXRjaC50eXBlXS5hcHBseSh0aGlzLCBwYXRjaC5hcmdzKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEpTT05EYXRhU3RvcmU7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVmZXJlbmNlVHlwZXMgPSB7XG4gICdhcnJheSc6IHRydWUsXG4gICdvYmplY3QnOiB0cnVlXG59O1xuXG52YXIgY29tbW9uS2V5VHlwZXMgPSB7XG4gICdzdHJpbmcnOiB0cnVlLFxuICAnbnVtYmVyJzogdHJ1ZVxufTtcblxudmFyIHR5cGUgPSBmdW5jdGlvbiB0eXBlKGRhdGEpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkYXRhKS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcbn07XG5cbnZhciBpc1JlZmVyZW5jZVR5cGUgPSBmdW5jdGlvbiBpc1JlZmVyZW5jZVR5cGUoZGF0YSkge1xuICByZXR1cm4gcmVmZXJlbmNlVHlwZXNbdHlwZShkYXRhKV0gfHwgZmFsc2U7XG59O1xuXG52YXIgaXNDb21tb25LZXlUeXBlID0gZnVuY3Rpb24gaXNDb21tb25LZXlUeXBlKGtleSkge1xuICByZXR1cm4gY29tbW9uS2V5VHlwZXNbdHlwZShrZXkpXSB8fCBmYWxzZTtcbn07XG5cbnZhciBjb3B5ID0gZnVuY3Rpb24gY29weShkYXRhKSB7XG4gIHJldHVybiBpc1JlZmVyZW5jZVR5cGUoZGF0YSkgPyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKSA6IGRhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdHlwZTogdHlwZSxcbiAgY29weTogY29weSxcbiAgaXNSZWZlcmVuY2VUeXBlOiBpc1JlZmVyZW5jZVR5cGUsXG4gIGlzQ29tbW9uS2V5VHlwZTogaXNDb21tb25LZXlUeXBlXG59OyIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9zdG9yZScpOyJdfQ==
