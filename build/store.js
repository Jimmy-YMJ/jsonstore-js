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
  reInit: function reInit(options) {
    JSONDataStore.call(this, options || this.initialOptions);
    return this;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy8uNi4wLjFAYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9zdG9yZS5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgc3BsaWNlID0gQXJyYXkucHJvdG90eXBlLnNwbGljZTtcblxudmFyIGNyZWF0ZUFycmF5ID0gZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoLCBpbmZpbGxpbmcpIHtcbiAgbGVuZ3RoID0gbGVuZ3RoIHx8IDA7XG4gIHZhciBhcnIgPSBbXSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgYXJyLnB1c2goaW5maWxsaW5nID09PSB1bmRlZmluZWQgPyBudWxsIDogaW5maWxsaW5nKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudmFyIGlzMmRBcnJheSA9IGZ1bmN0aW9uIGlzMmRBcnJheShhcnIpIHtcbiAgdmFyIGlzMmQ7XG4gIGlmIChpczJkID0gdXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknICYmIGFyci5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBhcnIubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlzMmQgJj0gdXRpbHMudHlwZShhcnJbaV0pID09PSAnYXJyYXknO1xuICAgICAgaWYgKCFpczJkKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjcmVhdGUyZEFycmF5ID0gZnVuY3Rpb24gY3JlYXRlMmRBcnJheShyb3csIGNvbCwgaW5maWxsaW5nKSB7XG4gIHJvdyA9IHJvdyB8fCAwO1xuICBjb2wgPSBjb2wgfHwgMDtcbiAgdmFyIGFyciA9IG5ldyBBcnJheShyb3cpLFxuICAgICAgaSA9IDA7XG4gIGZvciAoOyBpIDwgcm93OyBpKyspIHtcbiAgICBhcnJbaV0gPSBjcmVhdGVBcnJheShjb2wsIGluZmlsbGluZyk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBwYXJzZUFycmF5SW5kZXggPSBmdW5jdGlvbiBwYXJzZUFycmF5SW5kZXgoaW5kZXgpIHtcbiAgdmFyIHR5cGUgPSB1dGlscy50eXBlKGluZGV4KTtcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnIHx8IHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHBhcnNlSW50KGluZGV4KTtcbiAgfVxuICByZXR1cm4gdm9pZCAwO1xufTtcblxudmFyIGdldEFycmF5SW5kZXhCeVZhbHVlID0gZnVuY3Rpb24gZ2V0QXJyYXlJbmRleEJ5VmFsdWUoYXJyLCB2YWx1ZSkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIHZhbHVlVHlwZSA9IHV0aWxzLnR5cGUodmFsdWUpO1xuICAgIGlmICh2YWx1ZVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgbGVuID0gYXJyLmxlbmd0aCxcbiAgICAgICAgICBpdGVtO1xuICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpdGVtID0gYXJyW2ldO1xuICAgICAgICB2YXIgaXNFcXVhbCA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaXNFcXVhbCA9IGl0ZW1ba2V5XSA9PT0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIGlmICghaXNFcXVhbCkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0VxdWFsKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFyci5pbmRleE9mKHZhbHVlKTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtVXAgPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtVXAoYXJyLCBpbmRleCkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgaW5kZXggPSBwYXJzZUFycmF5SW5kZXgoaW5kZXgpO1xuICAgIHZhciBjdXJySXRlbSA9IGFycltpbmRleF07XG4gICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCAtIDFdO1xuICAgICAgYXJyW2luZGV4IC0gMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtRG93biA9IGZ1bmN0aW9uIG1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA8IGFyci5sZW5ndGggLSAxKSB7XG4gICAgICBhcnJbaW5kZXhdID0gYXJyW2luZGV4ICsgMV07XG4gICAgICBhcnJbaW5kZXggKyAxXSA9IGN1cnJJdGVtO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHNwcmVhZEFycmF5ID0gZnVuY3Rpb24gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgaW5maWxsaW5nKSB7XG4gIHZhciBkZWxldGVkID0gW107XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICB2YXIgaW5maWxsaW5nVHlwZSA9IHV0aWxzLnR5cGUoaW5maWxsaW5nKTtcbiAgICBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoaW5maWxsaW5nKSk7XG4gICAgfSBlbHNlIGlmIChpbmZpbGxpbmdUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKGluZmlsbGluZyA+IDApIHtcbiAgICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoY3JlYXRlQXJyYXkoaW5maWxsaW5nKSkpO1xuICAgICAgfSBlbHNlIGlmIChpbmZpbGxpbmcgPCAwKSB7XG4gICAgICAgIGRlbGV0ZWQgPSBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIE1hdGguYWJzKGluZmlsbGluZyldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG52YXIgc3ByZWFkMmRBcnJheVJvdyA9IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3coYXJyLCBiZWdpbiwgcm93cykge1xuICB2YXIgZGVsZXRlZCA9IFtdLFxuICAgICAgcm93c1R5cGUgPSB1dGlscy50eXBlKHJvd3MpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgY29sQ291bnQgPSBhcnJbMF0ubGVuZ3RoO1xuICAgIGlmIChyb3dzVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGlmIChyb3dzID4gMCkge1xuICAgICAgICBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCBjcmVhdGUyZEFycmF5KHJvd3MsIGNvbENvdW50KSk7XG4gICAgICB9IGVsc2UgaWYgKHJvd3MgPCAwKSB7XG4gICAgICAgIGRlbGV0ZWQgPSBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCByb3dzKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJvd3NUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCByb3dzKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG52YXIgc3ByZWFkMmRBcnJheUNvbCA9IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlDb2woYXJyLCBiZWdpbiwgY29scykge1xuICB2YXIgZGVsZXRlZCA9IFtdLFxuICAgICAgZGVsZXRlZENvbCxcbiAgICAgIGNvbHNUeXBlID0gdXRpbHMudHlwZShjb2xzKTtcbiAgaWYgKGlzMmRBcnJheShhcnIpKSB7XG4gICAgdmFyIHJvd0NvdW50ID0gYXJyLmxlbmd0aCxcbiAgICAgICAgaSA9IDA7XG4gICAgaWYgKGNvbHNUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgZm9yICg7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIGRlbGV0ZWRDb2wgPSBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzKTtcbiAgICAgICAgaWYgKGRlbGV0ZWRDb2wubGVuZ3RoKSB7XG4gICAgICAgICAgZGVsZXRlZC5wdXNoKGRlbGV0ZWRDb2wpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xzVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgZm9yICg7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIHNwcmVhZEFycmF5KGFycltpXSwgYmVnaW4sIGNvbHNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpczJkQXJyYXk6IGlzMmRBcnJheSxcbiAgY3JlYXRlQXJyYXk6IGNyZWF0ZUFycmF5LFxuICBjcmVhdGUyZEFycmF5OiBjcmVhdGUyZEFycmF5LFxuICBwYXJzZUFycmF5SW5kZXg6IHBhcnNlQXJyYXlJbmRleCxcbiAgZ2V0QXJyYXlJbmRleEJ5VmFsdWU6IGdldEFycmF5SW5kZXhCeVZhbHVlLFxuICBtb3ZlQXJyYXlJdGVtVXA6IG1vdmVBcnJheUl0ZW1VcCxcbiAgbW92ZUFycmF5SXRlbURvd246IG1vdmVBcnJheUl0ZW1Eb3duLFxuICBzcHJlYWRBcnJheTogc3ByZWFkQXJyYXksXG4gIHNwcmVhZDJkQXJyYXlSb3c6IHNwcmVhZDJkQXJyYXlSb3csXG4gIHNwcmVhZDJkQXJyYXlDb2w6IHNwcmVhZDJkQXJyYXlDb2xcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBnZXRPYmplY3RLZXlCeVZhbHVlID0gZnVuY3Rpb24gZ2V0T2JqZWN0S2V5QnlWYWx1ZShvYmosIHZhbHVlKSB7XG4gIHZhciBvYmpLZXksIG9ialZhbHVlLCB2YWx1ZUtleTtcbiAgaWYgKHV0aWxzLnR5cGUodmFsdWUpID09PSAnb2JqZWN0Jykge1xuICAgIG91dGVyOiBmb3IgKG9iaktleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkob2JqS2V5KSAmJiB1dGlscy50eXBlKG9ialZhbHVlID0gb2JqW29iaktleV0pID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmb3IgKHZhbHVlS2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KHZhbHVlS2V5KSAmJiB2YWx1ZVt2YWx1ZUtleV0gIT09IG9ialZhbHVlW3ZhbHVlS2V5XSkge1xuICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmpLZXk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAob2JqS2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShvYmpLZXkpICYmIG9ialtvYmpLZXldID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gb2JqS2V5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgdmFyIHRhcmdldCA9IGFyZ3VtZW50c1swXSxcbiAgICAgIGFyZ0xlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJnTGVuOyBpKyspIHtcbiAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldLFxuICAgICAgICBrZXk7XG4gICAgaWYgKHV0aWxzLnR5cGUoc291cmNlKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICB0YXJnZXRba2V5XSA9IHV0aWxzLmNvcHkoc291cmNlW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaGFzT3duUHJvcGVydHk6IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG4gIGV4dGVuZDogZXh0ZW5kLFxuICBnZXRPYmplY3RLZXlCeVZhbHVlOiBnZXRPYmplY3RLZXlCeVZhbHVlXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xudmFyIG9iamVjdCA9IHJlcXVpcmUoJy4vb2JqZWN0Jyk7XG5cbnZhciBwYXRjaFR5cGVzID0ge1xuICBhZGQ6ICdhZGQnLFxuICByZW1vdmU6ICdyZW1vdmUnLFxuICB1cGRhdGU6ICd1cGRhdGUnLFxuICBtb3ZlVXA6ICdtb3ZlVXAnLFxuICBtb3ZlRG93bjogJ21vdmVEb3duJyxcbiAgbW92ZVRvOiAnbW92ZVRvJyxcbiAgZXhjaGFuZ2U6ICdleGNoYW5nZScsXG4gIGV4dGVuZE9iamVjdDogJ2V4dGVuZE9iamVjdCcsXG4gIHNwcmVhZEFycmF5OiAnc3ByZWFkQXJyYXknLFxuICBzcHJlYWQyZEFycmF5Q29sOiAnc3ByZWFkMmRBcnJheUNvbCcsXG4gIHNwcmVhZDJkQXJyYXlSb3c6ICdzcHJlYWQyZEFycmF5Um93J1xufTtcblxudmFyIGNyZWF0ZVBhdGNoID0gZnVuY3Rpb24gY3JlYXRlUGF0Y2godHlwZSwgYXJncykge1xuICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncyk7XG4gIHJldHVybiB1dGlscy5jb3B5KHtcbiAgICB0eXBlOiB0eXBlLFxuICAgIGFyZ3M6IGFyZ3NcbiAgfSk7XG59O1xuXG4vKipcbiAqIGNyZWF0ZSBwYXRjaCBvcGVyYXRpb25zXG4gKiAqL1xuXG52YXIgcGF0Y2hNZXRob2RzID0ge1xuICBjcmVhdGVBZGQ6IGZ1bmN0aW9uIGNyZWF0ZUFkZChwYXRoLCB2YWx1ZSwga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuYWRkLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVSZW1vdmU6IGZ1bmN0aW9uIGNyZWF0ZVJlbW92ZShwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMucmVtb3ZlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVVcGRhdGU6IGZ1bmN0aW9uIGNyZWF0ZVVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy51cGRhdGUsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVVcDogZnVuY3Rpb24gY3JlYXRlTW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVXAsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVEb3duOiBmdW5jdGlvbiBjcmVhdGVNb3ZlRG93bihwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZURvd24sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVUbzogZnVuY3Rpb24gY3JlYXRlTW92ZVRvKGZyb20sIHRvLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVG8sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZUV4Y2hhbmdlOiBmdW5jdGlvbiBjcmVhdGVFeGNoYW5nZShmcm9tLCB0bykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4Y2hhbmdlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGNyZWF0ZUV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuZXh0ZW5kT2JqZWN0LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWRBcnJheTogZnVuY3Rpb24gY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZEFycmF5LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBjcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc3ByZWFkMmRBcnJheVJvdywgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlDb2wsIGFyZ3VtZW50cyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIEpTT05EYXRhU3RvcmUob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5pbml0aWFsT3B0aW9ucyA9IHV0aWxzLmNvcHkob3B0aW9ucyk7XG4gIHZhciBzdG9yZSA9IG9wdGlvbnMuc3RvcmUsXG4gICAgICBjb3B5U3RvcmUgPSBvcHRpb25zLmNvcHlTdG9yZSAhPT0gZmFsc2U7XG4gIHRoaXMuc3RvcmUgPSBjb3B5U3RvcmUgPyB1dGlscy5jb3B5KHN0b3JlKSA6IHN0b3JlO1xuICAvLyAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgdGhpcy5wYXRjaGVzID0gW107XG4gIHRoaXMucmVsYXRpdmVQYXRjaGVzID0gW107XG4gIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgdGhpcy5jdXJyZW50UGF0aCA9IFtdO1xuICB0aGlzLmlzRG9pbmcgPSBmYWxzZTtcbn1cblxuSlNPTkRhdGFTdG9yZS5wcm90b3R5cGUgPSB7XG4gIF9nZXRSZWY6IGZ1bmN0aW9uIF9nZXRSZWYocGF0aCkge1xuICAgIHZhciByZWYgPSB0aGlzLnN0b3JlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgcmVmID0gcmVmW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gcmVmO1xuICB9LFxuICBfZGV0ZWN0UGF0aDogZnVuY3Rpb24gX2RldGVjdFBhdGgocGF0aCkge1xuICAgIHZhciBkZXRlY3RlZCA9IFtdLFxuICAgICAgICByZWYgPSB0aGlzLnN0b3JlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIGtleSxcbiAgICAgICAga2V5VHlwZSxcbiAgICAgICAgcmVmVHlwZTtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrZXkgPSBwYXRoW2ldO1xuICAgICAga2V5VHlwZSA9IHV0aWxzLnR5cGUoa2V5KTtcbiAgICAgIHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZik7XG4gICAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGtleSwgJ19fdmFsdWUnKSkge1xuICAgICAgICAgIHZhciBvYmpLZXkgPSBvYmplY3QuZ2V0T2JqZWN0S2V5QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAob2JqS2V5KSB7XG4gICAgICAgICAgICByZWYgPSByZWZbb2JqS2V5XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2gob2JqS2V5KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChyZWYsIGtleSkpIHtcbiAgICAgICAgICByZWYgPSByZWZba2V5XTtcbiAgICAgICAgICBkZXRlY3RlZC5wdXNoKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGtleSwgJ19fdmFsdWUnKSkge1xuICAgICAgICAgIHZhciBpbmRleCA9IGFycmF5LmdldEFycmF5SW5kZXhCeVZhbHVlKHJlZiwga2V5Ll9fdmFsdWUpO1xuICAgICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgICByZWYgPSByZWZbaW5kZXhdO1xuICAgICAgICAgICAgZGV0ZWN0ZWQucHVzaChpbmRleCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGV0ZWN0ZWQ7XG4gIH0sXG4gIF9mb3JtYXRQYXRoOiBmdW5jdGlvbiBfZm9ybWF0UGF0aChwYXRoLCBkZXRlY3QpIHtcbiAgICB2YXIgcGF0aFR5cGUgPSB1dGlscy50eXBlKHBhdGgpO1xuICAgIGlmIChwYXRoVHlwZSA9PT0gJ3VuZGVmaW5lZCcgfHwgcGF0aFR5cGUgPT09ICdudWxsJykge1xuICAgICAgcGF0aCA9IFtdO1xuICAgIH0gZWxzZSBpZiAocGF0aFR5cGUgIT09ICdhcnJheScpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfVxuICAgIGlmIChkZXRlY3QgIT09IGZhbHNlKSB7XG4gICAgICB2YXIgZGV0ZWN0ZWQgPSB0aGlzLl9kZXRlY3RQYXRoKHBhdGgpO1xuICAgICAgaWYgKGRldGVjdGVkLmxlbmd0aCA9PT0gcGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGRldGVjdGVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9LFxuICBfbW92ZUFycmF5SXRlbTogZnVuY3Rpb24gX21vdmVBcnJheUl0ZW0ocGF0aCwgbW92ZVVwKSB7XG4gICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFmdWxsUGF0aCB8fCBmdWxsUGF0aC5sZW5ndGggPCAxKSByZXR1cm4gdGhpcztcbiAgICB2YXIgaXRlbUluZGV4ID0gZnVsbFBhdGgucG9wKCksXG4gICAgICAgIGFyciA9IHRoaXMuX2dldFJlZihmdWxsUGF0aCk7XG4gICAgaWYgKHV0aWxzLnR5cGUoYXJyKSAhPT0gJ2FycmF5JykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIG1ldGhvZCA9IG1vdmVVcCA9PT0gdHJ1ZSA/ICdjcmVhdGVNb3ZlVXAnIDogJ2NyZWF0ZU1vdmVEb3duJyxcbiAgICAgICAgcmV2ZXJzZU1ldGhvZCA9IG1ldGhvZCA9PT0gJ2NyZWF0ZU1vdmVVcCcgPyAnY3JlYXRlTW92ZURvd24nIDogJ2NyZWF0ZU1vdmVVcCc7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0oZnVsbFBhdGguY29uY2F0KGl0ZW1JbmRleCkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0odGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSkpO1xuICAgICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSAmJiBpdGVtSW5kZXggPiAwIHx8IG1vdmVVcCAhPT0gdHJ1ZSAmJiBpdGVtSW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzW3JldmVyc2VNZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChtb3ZlVXAgPT09IHRydWUgPyBpdGVtSW5kZXggLSAxIDogaXRlbUluZGV4ICsgMSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSkge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbVVwKGFyciwgaXRlbUluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbURvd24oYXJyLCBpdGVtSW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgX2dldEZ1bGxQYXRoOiBmdW5jdGlvbiBfZ2V0RnVsbFBhdGgocGF0aCkge1xuICAgIHZhciBjdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodGhpcy5jdXJyZW50UGF0aCwgZmFsc2UpLFxuICAgICAgICBmdWxsUGF0aCA9IGN1cnJlbnRQYXRoLmNvbmNhdCh0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKSk7XG4gICAgcmV0dXJuIHRoaXMuX2Zvcm1hdFBhdGgoZnVsbFBhdGgpO1xuICB9LFxuICBfZ2V0UmVsYXRpdmVQYXRoOiBmdW5jdGlvbiBfZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSB7XG4gICAgcmV0dXJuIGZ1bGxQYXRoLnNsaWNlKHRoaXMuY3VycmVudFBhdGgubGVuZ3RoKTtcbiAgfSxcbiAgcmVJbml0OiBmdW5jdGlvbiByZUluaXQob3B0aW9ucykge1xuICAgIEpTT05EYXRhU3RvcmUuY2FsbCh0aGlzLCBvcHRpb25zIHx8IHRoaXMuaW5pdGlhbE9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBnb1RvOiBmdW5jdGlvbiBnb1RvKHBhdGgsIGFkZFVwKSB7XG4gICAgaWYgKCF0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91IGFyZSB1c2luZyBzdG9yZS5nb1RvIG91dHNpZGUgc3RvcmUuZG8hJyk7XG4gICAgfVxuICAgIGlmIChhZGRVcCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodGhpcy5jdXJyZW50UGF0aC5jb25jYXQodGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkbzogZnVuY3Rpb24gX2RvKG5hbWUsIGFjdGlvbiwgZGF0YSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZGF0YSA9IGFjdGlvbjtcbiAgICAgIGFjdGlvbiA9IG5hbWU7XG4gICAgICBuYW1lID0gJyc7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB0aGlzLmlzRG9pbmcgPSB0cnVlO1xuICAgIGFjdGlvbih0aGlzLCBkYXRhLCBuYW1lKTtcbiAgICAvLyBjb21wb3NlIHJlc3VsdFxuICAgIHJlc3VsdC5wYXRjaGVzID0gdGhpcy5wYXRjaGVzO1xuICAgIHJlc3VsdC5yZWxhdGl2ZVBhdGNoZXMgPSB0aGlzLnJlbGF0aXZlUGF0Y2hlcztcbiAgICByZXN1bHQuYmFja1BhdGNoZXMgPSB0aGlzLmJhY2tQYXRjaGVzO1xuICAgIC8vIHJlc2V0ICdkbycgYWJvdXQgYXR0cmlidXRlc1xuICAgIHRoaXMucGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzID0gW107XG4gICAgdGhpcy5iYWNrUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSBbXTtcbiAgICB0aGlzLmlzRG9pbmcgPSBmYWxzZTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBhZGQ6IGZ1bmN0aW9uIGFkZChwYXRoLCB2YWx1ZSwga2V5KSB7XG4gICAgdmFyIHJlZiwgcmVmVHlwZTtcbiAgICBwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFwYXRoIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAocmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKSkgPT09ICdvYmplY3QnICYmICF1dGlscy5pc0NvbW1vbktleVR5cGUoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVBZGQocGF0aCwgdmFsdWUsIGtleSkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgdmFsdWUsIGtleSkpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHBhdGguY29uY2F0KGtleSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpLCB0cnVlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmVmW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluZGV4ID0gYXJyYXkucGFyc2VBcnJheUluZGV4KGtleSk7XG4gICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZWYuc3BsaWNlKGluZGV4LCAwLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWYucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShwYXRoKSB7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgIH1cbiAgICBpZiAocGF0aC5sZW5ndGggPCAxKSB7XG4gICAgICB0aGlzLnN0b3JlID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBsYXN0S2V5ID0gcGF0aC5wb3AoKSxcbiAgICAgICAgcmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpLFxuICAgICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICByZWYuc3BsaWNlKGxhc3RLZXksIDEpO1xuICAgIH0gZWxzZSBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGRlbGV0ZSByZWZbbGFzdEtleV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUpIHtcbiAgICBwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIGxhc3RLZXksXG4gICAgICAgIGZ1bGxQYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKTtcbiAgICBpZiAoZnVsbFBhdGgpIHtcbiAgICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShmdWxsUGF0aCwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aCksIHZhbHVlKSk7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB0aGlzLmdldChmdWxsUGF0aCkpKTtcbiAgICAgIH1cbiAgICAgIGxhc3RLZXkgPSBmdWxsUGF0aC5wb3AoKTtcbiAgICAgIGlmIChsYXN0S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fZ2V0UmVmKGZ1bGxQYXRoKVtsYXN0S2V5XSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdG9yZSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIGlmIChmb3JjZVVwZGF0ZSA9PT0gdHJ1ZSAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIGxhc3RLZXkgPSBwYXRoLnBvcCgpO1xuICAgICAgcmV0dXJuIHRoaXMuYWRkKHBhdGgsIHZhbHVlLCBsYXN0S2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24gc2V0KHBhdGgsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgfSxcbiAgbW92ZVVwOiBmdW5jdGlvbiBtb3ZlVXAocGF0aCkge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlQXJyYXlJdGVtKHBhdGgsIHRydWUpO1xuICB9LFxuICBtb3ZlRG93bjogZnVuY3Rpb24gbW92ZURvd24ocGF0aCkge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlQXJyYXlJdGVtKHBhdGgpO1xuICB9LFxuICBtb3ZlVG86IGZ1bmN0aW9uIG1vdmVUbyhmcm9tLCB0bywga2V5KSB7XG4gICAgZnJvbSA9IHRoaXMuX2dldEZ1bGxQYXRoKGZyb20pO1xuICAgIHRvID0gdGhpcy5fZ2V0RnVsbFBhdGgodG8pO1xuICAgIGlmICghZnJvbSB8fCAhdG8gfHwgIXV0aWxzLmlzUmVmZXJlbmNlVHlwZSh0aGlzLl9nZXRSZWYodG8pKSkgcmV0dXJuIHRoaXM7XG4gICAgdGhpcy5hZGQodG8sIHRoaXMuX2dldFJlZihmcm9tKSwga2V5KTtcbiAgICB0aGlzLnJlbW92ZShmcm9tKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZXhjaGFuZ2U6IGZ1bmN0aW9uIGV4Y2hhbmdlKGZyb20sIHRvKSB7XG4gICAgZnJvbSA9IHRoaXMuX2Zvcm1hdFBhdGgoZnJvbSk7XG4gICAgdG8gPSB0aGlzLl9mb3JtYXRQYXRoKHRvKTtcbiAgICBpZiAoZnJvbSAmJiB0bykge1xuICAgICAgdmFyIGZyb21SZWYgPSB0aGlzLl9nZXRSZWYoZnJvbSksXG4gICAgICAgICAgdG9SZWYgPSB0aGlzLmdldCh0byk7XG4gICAgICB0aGlzLnVwZGF0ZShmcm9tLCB0b1JlZik7XG4gICAgICB0aGlzLnVwZGF0ZSh0bywgZnJvbVJlZik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBleHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlKSB7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKSkgfHwgdXRpbHMudHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpICE9PSAnb2JqZWN0JykgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUV4dGVuZE9iamVjdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUV4dGVuZE9iamVjdCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGEsIGIsIGMsIGQsIGUpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIG9iamVjdC5leHRlbmQocmVmLCBhLCBiLCBjLCBkLCBlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkQXJyYXk6IGZ1bmN0aW9uIHNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcpIHtcbiAgICB2YXIgcmVmO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgpKSB8fCB1dGlscy50eXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgIT09ICdhcnJheScpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IGJlZ2luIHx8IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZEFycmF5KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGluZmlsbGluZykpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkQXJyYXkocmVmLCBiZWdpbiwgaW5maWxsaW5nKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gc3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cykge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCkpIHx8ICFhcnJheS5pczJkQXJyYXkocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAhKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IGJlZ2luIHx8IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3codGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgcm93cykpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkMmRBcnJheVJvdyhyZWYsIGJlZ2luLCByb3dzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scykge1xuICAgIHZhciByZWY7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCkpIHx8ICFhcnJheS5pczJkQXJyYXkocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAhKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IGJlZ2luIHx8IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgY29scykpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkMmRBcnJheUNvbChyZWYsIGJlZ2luLCBjb2xzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQocGF0aCwgY29weSkge1xuICAgIGlmIChwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHtcbiAgICAgIHJldHVybiBjb3B5ID09PSBmYWxzZSA/IHRoaXMuX2dldFJlZihwYXRoKSA6IHV0aWxzLmNvcHkodGhpcy5fZ2V0UmVmKHBhdGgpKTtcbiAgICB9XG4gIH0sXG4gIHBhdGNoOiBwYXRjaE1ldGhvZHMsXG4gIGFwcGx5UGF0Y2g6IGZ1bmN0aW9uIGFwcGx5UGF0Y2gocGF0Y2hlcykge1xuICAgIHBhdGNoZXMgPSB1dGlscy50eXBlKHBhdGNoZXMpID09PSAnYXJyYXknID8gcGF0Y2hlcyA6IFtwYXRjaGVzXTtcbiAgICBwYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICB0aGlzW3BhdGNoLnR5cGVdLmFwcGx5KHRoaXMsIHBhdGNoLmFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSlNPTkRhdGFTdG9yZTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciByZWZlcmVuY2VUeXBlcyA9IHtcbiAgJ2FycmF5JzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWVcbn07XG5cbnZhciBjb21tb25LZXlUeXBlcyA9IHtcbiAgJ3N0cmluZyc6IHRydWUsXG4gICdudW1iZXInOiB0cnVlXG59O1xuXG52YXIgdHlwZSA9IGZ1bmN0aW9uIHR5cGUoZGF0YSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGEpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xufTtcblxudmFyIGlzUmVmZXJlbmNlVHlwZSA9IGZ1bmN0aW9uIGlzUmVmZXJlbmNlVHlwZShkYXRhKSB7XG4gIHJldHVybiByZWZlcmVuY2VUeXBlc1t0eXBlKGRhdGEpXSB8fCBmYWxzZTtcbn07XG5cbnZhciBpc0NvbW1vbktleVR5cGUgPSBmdW5jdGlvbiBpc0NvbW1vbktleVR5cGUoa2V5KSB7XG4gIHJldHVybiBjb21tb25LZXlUeXBlc1t0eXBlKGtleSldIHx8IGZhbHNlO1xufTtcblxudmFyIGNvcHkgPSBmdW5jdGlvbiBjb3B5KGRhdGEpIHtcbiAgcmV0dXJuIGlzUmVmZXJlbmNlVHlwZShkYXRhKSA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpIDogZGF0YTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0eXBlOiB0eXBlLFxuICBjb3B5OiBjb3B5LFxuICBpc1JlZmVyZW5jZVR5cGU6IGlzUmVmZXJlbmNlVHlwZSxcbiAgaXNDb21tb25LZXlUeXBlOiBpc0NvbW1vbktleVR5cGVcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL3N0b3JlJyk7Il19
