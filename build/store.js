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
var PathListener = _dereq_('./PathListener');
var JSON_STORE_CACHE_KEY_PREFIX = 'JSON_STORE_CACHE_KEY_PREFIX';
var emptyFunc = function emptyFunc() {};

function JSONDataStore(options) {
  options = options || {};
  this.initialOptions = utils.copy(options);
  var store = options.store,
      copyStore = options.copyStore !== false;
  this.copyStore = copyStore;
  this.store = copyStore ? utils.copy(store) : store;
  this.cacheKeys = this._getStoreKeysMap(options.cacheKeys, this.store);
  this.flashKeys = this._getStoreKeysMap(options.flashKeys, this.store);
  this.cacheKeyPrefix = options.cacheKeyPrefix || JSON_STORE_CACHE_KEY_PREFIX;
  this.localStorage = options.localStorage;
  // 'do' about attributes
  this.patches = [];
  this.relativePatches = [];
  this.backPatches = [];
  this.currentPath = [];
  this.isDoing = false;
  this.pathListener = new PathListener({ store: this.store, copyStore: copyStore, flashKeys: this.flashKeys });
  this.initialMutationActionPath = [];
}

JSONDataStore.prototype = {
  _storeUpdated: function _storeUpdated() {
    this._updateCache(this.initialMutationActionPath[0]);
    this.pathListener.checkPath(this.initialMutationActionPath);
  },
  _getStoreKeysMap: function _getStoreKeysMap(keys, store) {
    var keysMap = {};
    if (utils.type(keys) === 'array') {
      keys.forEach(function (key) {
        if (Object.hasOwnProperty.call(store, key)) {
          keysMap[key] = true;
        }
      });
    }
    return keysMap;
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
        key = void 0,
        keyType = void 0,
        refType = void 0;
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
    return path.slice();
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
    this._storeUpdated();
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
  registerPathListener: function registerPathListener(path, callback, group, check) {
    path = Array.isArray(path) ? path : [path];
    this.pathListener.registerListener(path, callback, group, check);
  },
  removeListenerByPath: function removeListenerByPath(path, callback) {
    path = Array.isArray(path) ? path : [path];
    this.pathListener.removeListenerByPath(path, callback);
  },
  removeListenerByGroup: function removeListenerByGroup(group) {
    this.pathListener.removeListenerByGroup(group);
  },
  removeAllListeners: function removeAllListeners() {
    this.pathListener.removeAllListeners();
  },
  loadCache: function loadCache(success, error) {
    var _this = this;

    error = typeof error === 'function' ? error : emptyFunc;
    if (this.localStorage && typeof this.localStorage.multiGet === 'function') {
      var cacheKeys = this.initialOptions.cacheKeys || [];
      var composedKeys = cacheKeys.map(function (key) {
        return _this._composeCacheKey(key);
      });
      this.localStorage.multiGet(composedKeys, function (cache) {
        var parsedCache = {};
        composedKeys.forEach(function (composedKey, index) {
          var key = cacheKeys[index];
          var cachedValue = cache[composedKey];
          _this.set(key, cachedValue === null ? _this.get(key) : cachedValue);
          parsedCache[key] = cache[composedKey];
        });
        success(parsedCache);
      }, error);
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
  add: function add(path, value, key, parentPath) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path, false);
    var ref = void 0,
        refType = void 0;
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
    this._storeUpdated();
    return this;
  },
  remove: function remove(path, parentPath) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path, false);
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
    this._storeUpdated();
    return this;
  },
  update: function update(path, value, forceUpdate, parentPath) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path, false);
    path = this._formatPath(path, false);
    var lastKey = void 0,
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
      this._storeUpdated();
      return this;
    } else if (forceUpdate === true && path.length > 0) {
      lastKey = path.pop();
      return this.add(path, value, lastKey, this.initialMutationActionPath);
    }
    return this;
  },
  set: function set(path, value) {
    return this.update(path, value, true, this._formatPath(path, false));
  },
  moveUp: function moveUp(path) {
    this.initialMutationActionPath = this._formatPath(path, false);
    return this._moveArrayItem(path, true);
  },
  moveDown: function moveDown(path) {
    this.initialMutationActionPath = this._formatPath(path, false);
    return this._moveArrayItem(path);
  },
  moveTo: function moveTo(from, to, key) {
    var parentFromPath = this._formatPath(from, false),
        parentToPath = this._formatPath(to, false);
    from = this._getFullPath(from);
    to = this._getFullPath(to);
    if (!from || !to || !utils.isReferenceType(this._getRef(to))) return this;
    this.add(to, this._getRef(from), key, parentToPath);
    this.remove(from, parentFromPath);
    return this;
  },
  exchange: function exchange(from, to) {
    var parentFromPath = this._formatPath(from, false),
        parentToPath = this._formatPath(to, false);
    from = this._getFullPath(from);
    to = this._getFullPath(to);
    if (from && to) {
      var fromRef = this._getRef(from),
          toRef = this.get(to);
      this.update(from, toRef, false, parentFromPath);
      this.update(to, fromRef, false, parentToPath);
    }
    return this;
  },
  extendObject: function extendObject(path, a, b, c, d, e, f) {
    this.initialMutationActionPath = this._formatPath(path, false);
    var ref = void 0;
    if (!(path = this._getFullPath(path)) || utils.type(ref = this._getRef(path)) !== 'object') return this;
    if (this.isDoing) {
      this.patches.push(patchMethods.createExtendObject.apply(this, arguments));
      this.relativePatches.push(patchMethods.createExtendObject(this._getRelativePath(path), a, b, c, d, e, f));
      this.backPatches.push(patchMethods.createUpdate(path, this.get(path)));
    }
    object.extend(ref, a, b, c, d, e, f);
    this._storeUpdated();
    return this;
  },
  spreadArray: function spreadArray(path, begin, infilling, simpleInfilling, count) {
    this.initialMutationActionPath = this._formatPath(path, false);
    var ref = void 0;
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
    this._storeUpdated();
    return this;
  },
  spread2dArrayRow: function spread2dArrayRow(path, begin, rows, simpleInfilling, count) {
    this.initialMutationActionPath = this._formatPath(path, false);
    var ref = void 0;
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
    this._storeUpdated();
    return this;
  },
  spread2dArrayCol: function spread2dArrayCol(path, begin, cols, simpleInfilling, count) {
    this.initialMutationActionPath = this._formatPath(path, false);
    var ref = void 0;
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
    this._storeUpdated();
    return this;
  },
  get: function get(path) {
    if (path = this._getFullPath(path)) {
      return this.copyStore ? utils.copy(this._getRef(path)) : this._getRef(path);
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
},{"./PathListener":2,"./array":3,"./object":4,"./patch":5,"./utils":6}],2:[function(_dereq_,module,exports){
'use strict';

function PathListener(options) {
  options = options || {};
  this.deepEqual = options.deepEqual === true;
  this.copyStore = options.copyStore;
  this.listenerTree = {};
  this.groupRefs = {};
  this.store = options.store || {};
  this.flashKeys = options.flashKeys || {};
}

PathListener.prototype = {
  _copyData: function _copyData(data) {
    if (data === undefined) return data;
    return this.copyStore ? JSON.parse(JSON.stringify(data)) : data;
  },
  _removeListener: function _removeListener(listeners, cb) {
    var index = listeners.indexOf(cb);
    index > -1 && (listeners[index] = null);
    return index;
  },
  registerListener: function registerListener(path, cb, group, check) {
    group = typeof group === 'string' ? group : null;
    check = group === null ? group !== false : check !== false;
    var i = 0,
        len = path.length,
        pathItem = void 0,
        treeRef = this.listenerTree,
        listenerIndex = void 0;
    while (i < len) {
      pathItem = path[i++];
      if (treeRef[pathItem] === undefined) {
        treeRef[pathItem] = { children: {}, listeners: [] };
      }
      treeRef = i === len ? treeRef[pathItem] : treeRef[pathItem].children;
    }
    listenerIndex = treeRef.listeners.indexOf(cb);
    listenerIndex = listenerIndex === -1 ? treeRef.listeners.push(cb) - 1 : listenerIndex;
    if (group !== null) {
      if (this.groupRefs[group] === undefined) {
        this.groupRefs[group] = [];
      }
      this.groupRefs[group].push([treeRef.listeners, listenerIndex]);
    }
    if (check) {
      this.checkPath(path);
    }
  },
  checkPath: function checkPath(path) {
    var _this = this;

    var i = 0,
        len = path.length,
        pathItem = void 0,
        treeRef = this.listenerTree,
        dataRef = this.store;
    while (i < len) {
      if (dataRef === undefined) break;
      pathItem = path[i++];
      dataRef = dataRef[pathItem];
      if (treeRef[pathItem] !== undefined) {
        treeRef[pathItem].listeners.forEach(function (listener) {
          typeof listener === 'function' && listener(_this._copyData(dataRef));
        });
      } else {
        break;
      }
      treeRef = treeRef[pathItem].children;
    }
    if (path.length === 1 && this.flashKeys[path[0]]) {
      this.store[path[0]] = null;
    }
  },
  removeAllListeners: function removeAllListeners() {
    this.listenerTree = {};
    this.groupRefs = {};
  },
  removeListenerByPath: function removeListenerByPath(path, cb) {
    if (typeof cb !== 'function') return void 0;
    var i = 0,
        len = path.length,
        pathItem = void 0,
        treeRef = this.listenerTree;
    while (i < len) {
      pathItem = path[i++];
      if (treeRef[pathItem] === undefined) {
        return void 0;
      }
      treeRef = i === len ? treeRef[pathItem] : treeRef[pathItem].children;
    }
    this._removeListener(treeRef.listeners, cb);
  },
  removeListenerByGroup: function removeListenerByGroup(group) {
    var groupListeners = this.groupRefs[group];
    if (groupListeners !== undefined) {
      groupListeners.forEach(function (pair) {
        typeof pair[0][pair[1]] === 'function' && (pair[0][pair[1]] = null);
      });
    }
  }
};

module.exports = PathListener;
},{}],3:[function(_dereq_,module,exports){
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
},{"./utils":6}],4:[function(_dereq_,module,exports){
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
},{"./utils":6}],5:[function(_dereq_,module,exports){
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
},{"./utils":6}],6:[function(_dereq_,module,exports){
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
},{}],7:[function(_dereq_,module,exports){
'use strict';

module.exports = _dereq_('./lib/JSONDataStore');
},{"./lib/JSONDataStore":1}]},{},[7])(7)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9KU09ORGF0YVN0b3JlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvUGF0aExpc3RlbmVyLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9wYXRjaC5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogb3B0aW9uczpcbiAqICBzdG9yZVxuICogIGNvcHlTdG9yZVxuICogIGNhY2hlS2V5c1xuICogIGxvY2FsU3RvcmFnZVxuICogKiovXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcbnZhciBvYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xudmFyIHBhdGNoTWV0aG9kcyA9IHJlcXVpcmUoJy4vcGF0Y2gnKTtcbnZhciBQYXRoTGlzdGVuZXIgPSByZXF1aXJlKCcuL1BhdGhMaXN0ZW5lcicpO1xudmFyIEpTT05fU1RPUkVfQ0FDSEVfS0VZX1BSRUZJWCA9ICdKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVgnO1xudmFyIGVtcHR5RnVuYyA9IGZ1bmN0aW9uIGVtcHR5RnVuYygpIHt9O1xuXG5mdW5jdGlvbiBKU09ORGF0YVN0b3JlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMuaW5pdGlhbE9wdGlvbnMgPSB1dGlscy5jb3B5KG9wdGlvbnMpO1xuICB2YXIgc3RvcmUgPSBvcHRpb25zLnN0b3JlLFxuICAgICAgY29weVN0b3JlID0gb3B0aW9ucy5jb3B5U3RvcmUgIT09IGZhbHNlO1xuICB0aGlzLmNvcHlTdG9yZSA9IGNvcHlTdG9yZTtcbiAgdGhpcy5zdG9yZSA9IGNvcHlTdG9yZSA/IHV0aWxzLmNvcHkoc3RvcmUpIDogc3RvcmU7XG4gIHRoaXMuY2FjaGVLZXlzID0gdGhpcy5fZ2V0U3RvcmVLZXlzTWFwKG9wdGlvbnMuY2FjaGVLZXlzLCB0aGlzLnN0b3JlKTtcbiAgdGhpcy5mbGFzaEtleXMgPSB0aGlzLl9nZXRTdG9yZUtleXNNYXAob3B0aW9ucy5mbGFzaEtleXMsIHRoaXMuc3RvcmUpO1xuICB0aGlzLmNhY2hlS2V5UHJlZml4ID0gb3B0aW9ucy5jYWNoZUtleVByZWZpeCB8fCBKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVg7XG4gIHRoaXMubG9jYWxTdG9yYWdlID0gb3B0aW9ucy5sb2NhbFN0b3JhZ2U7XG4gIC8vICdkbycgYWJvdXQgYXR0cmlidXRlc1xuICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMgPSBbXTtcbiAgdGhpcy5iYWNrUGF0Y2hlcyA9IFtdO1xuICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gIHRoaXMuaXNEb2luZyA9IGZhbHNlO1xuICB0aGlzLnBhdGhMaXN0ZW5lciA9IG5ldyBQYXRoTGlzdGVuZXIoeyBzdG9yZTogdGhpcy5zdG9yZSwgY29weVN0b3JlOiBjb3B5U3RvcmUsIGZsYXNoS2V5czogdGhpcy5mbGFzaEtleXMgfSk7XG4gIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IFtdO1xufVxuXG5KU09ORGF0YVN0b3JlLnByb3RvdHlwZSA9IHtcbiAgX3N0b3JlVXBkYXRlZDogZnVuY3Rpb24gX3N0b3JlVXBkYXRlZCgpIHtcbiAgICB0aGlzLl91cGRhdGVDYWNoZSh0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGhbMF0pO1xuICAgIHRoaXMucGF0aExpc3RlbmVyLmNoZWNrUGF0aCh0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGgpO1xuICB9LFxuICBfZ2V0U3RvcmVLZXlzTWFwOiBmdW5jdGlvbiBfZ2V0U3RvcmVLZXlzTWFwKGtleXMsIHN0b3JlKSB7XG4gICAgdmFyIGtleXNNYXAgPSB7fTtcbiAgICBpZiAodXRpbHMudHlwZShrZXlzKSA9PT0gJ2FycmF5Jykge1xuICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0b3JlLCBrZXkpKSB7XG4gICAgICAgICAga2V5c01hcFtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBrZXlzTWFwO1xuICB9LFxuICBfZ2V0UmVmOiBmdW5jdGlvbiBfZ2V0UmVmKHBhdGgpIHtcbiAgICB2YXIgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHJlZiA9IHJlZltwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZjtcbiAgfSxcbiAgX2RldGVjdFBhdGg6IGZ1bmN0aW9uIF9kZXRlY3RQYXRoKHBhdGgpIHtcbiAgICB2YXIgZGV0ZWN0ZWQgPSBbXSxcbiAgICAgICAgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBrZXkgPSB2b2lkIDAsXG4gICAgICAgIGtleVR5cGUgPSB2b2lkIDAsXG4gICAgICAgIHJlZlR5cGUgPSB2b2lkIDA7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcGF0aFtpXTtcbiAgICAgIGtleVR5cGUgPSB1dGlscy50eXBlKGtleSk7XG4gICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgb2JqS2V5ID0gb2JqZWN0LmdldE9iamVjdEtleUJ5VmFsdWUocmVmLCBrZXkuX192YWx1ZSk7XG4gICAgICAgICAgaWYgKG9iaktleSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW29iaktleV07XG4gICAgICAgICAgICBkZXRlY3RlZC5wdXNoKG9iaktleSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5nZXRBcnJheUluZGV4QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW2luZGV4XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2goaW5kZXgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlZiwga2V5KSkge1xuICAgICAgICAgIHJlZiA9IHJlZltrZXldO1xuICAgICAgICAgIGRldGVjdGVkLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRldGVjdGVkO1xuICB9LFxuICBfZm9ybWF0UGF0aDogZnVuY3Rpb24gX2Zvcm1hdFBhdGgocGF0aCwgZGV0ZWN0KSB7XG4gICAgdmFyIHBhdGhUeXBlID0gdXRpbHMudHlwZShwYXRoKTtcbiAgICBpZiAocGF0aFR5cGUgPT09ICd1bmRlZmluZWQnIHx8IHBhdGhUeXBlID09PSAnbnVsbCcpIHtcbiAgICAgIHBhdGggPSBbXTtcbiAgICB9IGVsc2UgaWYgKHBhdGhUeXBlICE9PSAnYXJyYXknKSB7XG4gICAgICBwYXRoID0gW3BhdGhdO1xuICAgIH1cbiAgICBpZiAoZGV0ZWN0ICE9PSBmYWxzZSkge1xuICAgICAgdmFyIGRldGVjdGVkID0gdGhpcy5fZGV0ZWN0UGF0aChwYXRoKTtcbiAgICAgIGlmIChkZXRlY3RlZC5sZW5ndGggPT09IHBhdGgubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBkZXRlY3RlZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5zbGljZSgpO1xuICB9LFxuICBfbW92ZUFycmF5SXRlbTogZnVuY3Rpb24gX21vdmVBcnJheUl0ZW0ocGF0aCwgbW92ZVVwKSB7XG4gICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFmdWxsUGF0aCB8fCBmdWxsUGF0aC5sZW5ndGggPCAxKSByZXR1cm4gdGhpcztcbiAgICB2YXIgaXRlbUluZGV4ID0gZnVsbFBhdGgucG9wKCksXG4gICAgICAgIGFyciA9IHRoaXMuX2dldFJlZihmdWxsUGF0aCk7XG4gICAgaWYgKHV0aWxzLnR5cGUoYXJyKSAhPT0gJ2FycmF5JykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIG1ldGhvZCA9IG1vdmVVcCA9PT0gdHJ1ZSA/ICdjcmVhdGVNb3ZlVXAnIDogJ2NyZWF0ZU1vdmVEb3duJyxcbiAgICAgICAgcmV2ZXJzZU1ldGhvZCA9IG1ldGhvZCA9PT0gJ2NyZWF0ZU1vdmVVcCcgPyAnY3JlYXRlTW92ZURvd24nIDogJ2NyZWF0ZU1vdmVVcCc7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0oZnVsbFBhdGguY29uY2F0KGl0ZW1JbmRleCkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0odGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSkpO1xuICAgICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSAmJiBpdGVtSW5kZXggPiAwIHx8IG1vdmVVcCAhPT0gdHJ1ZSAmJiBpdGVtSW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzW3JldmVyc2VNZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChtb3ZlVXAgPT09IHRydWUgPyBpdGVtSW5kZXggLSAxIDogaXRlbUluZGV4ICsgMSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSkge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbVVwKGFyciwgaXRlbUluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbURvd24oYXJyLCBpdGVtSW5kZXgpO1xuICAgIH1cbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgX2dldEZ1bGxQYXRoOiBmdW5jdGlvbiBfZ2V0RnVsbFBhdGgocGF0aCkge1xuICAgIGlmICh1dGlscy5pc1JlZmVyZW5jZVR5cGUocGF0aCkgJiYgcGF0aC5pc0Z1bGwpIHtcbiAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbiAgICB2YXIgY3VycmVudFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRoaXMuY3VycmVudFBhdGgsIGZhbHNlKSxcbiAgICAgICAgZnVsbFBhdGggPSBjdXJyZW50UGF0aC5jb25jYXQodGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSkpLFxuICAgICAgICBmb3JtYXR0ZWRGdWxsUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgoZnVsbFBhdGgpO1xuICAgIGlmIChmb3JtYXR0ZWRGdWxsUGF0aCkge1xuICAgICAgZm9ybWF0dGVkRnVsbFBhdGguaXNGdWxsID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdHRlZEZ1bGxQYXRoO1xuICB9LFxuICBfZ2V0UmVsYXRpdmVQYXRoOiBmdW5jdGlvbiBfZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSB7XG4gICAgcmV0dXJuIGZ1bGxQYXRoLnNsaWNlKHRoaXMuY3VycmVudFBhdGgubGVuZ3RoKTtcbiAgfSxcbiAgX2NvbXBvc2VDYWNoZUtleTogZnVuY3Rpb24gX2NvbXBvc2VDYWNoZUtleShrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZUtleVByZWZpeCArICdAJyArIGtleTtcbiAgfSxcbiAgX3VwZGF0ZUNhY2hlOiBmdW5jdGlvbiBfdXBkYXRlQ2FjaGUoa2V5KSB7XG4gICAgaWYgKHRoaXMuY2FjaGVLZXlzW2tleV0gJiYgdGhpcy5sb2NhbFN0b3JhZ2UgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5fY29tcG9zZUNhY2hlS2V5KGtleSksIHRoaXMuZ2V0KGtleSkpO1xuICAgIH1cbiAgfSxcbiAgcmVnaXN0ZXJQYXRoTGlzdGVuZXI6IGZ1bmN0aW9uIHJlZ2lzdGVyUGF0aExpc3RlbmVyKHBhdGgsIGNhbGxiYWNrLCBncm91cCwgY2hlY2spIHtcbiAgICBwYXRoID0gQXJyYXkuaXNBcnJheShwYXRoKSA/IHBhdGggOiBbcGF0aF07XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIucmVnaXN0ZXJMaXN0ZW5lcihwYXRoLCBjYWxsYmFjaywgZ3JvdXAsIGNoZWNrKTtcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXJCeVBhdGg6IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyQnlQYXRoKHBhdGgsIGNhbGxiYWNrKSB7XG4gICAgcGF0aCA9IEFycmF5LmlzQXJyYXkocGF0aCkgPyBwYXRoIDogW3BhdGhdO1xuICAgIHRoaXMucGF0aExpc3RlbmVyLnJlbW92ZUxpc3RlbmVyQnlQYXRoKHBhdGgsIGNhbGxiYWNrKTtcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXJCeUdyb3VwOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5R3JvdXAoZ3JvdXApIHtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5yZW1vdmVMaXN0ZW5lckJ5R3JvdXAoZ3JvdXApO1xuICB9LFxuICByZW1vdmVBbGxMaXN0ZW5lcnM6IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycygpIHtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgfSxcbiAgbG9hZENhY2hlOiBmdW5jdGlvbiBsb2FkQ2FjaGUoc3VjY2VzcywgZXJyb3IpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgZXJyb3IgPSB0eXBlb2YgZXJyb3IgPT09ICdmdW5jdGlvbicgPyBlcnJvciA6IGVtcHR5RnVuYztcbiAgICBpZiAodGhpcy5sb2NhbFN0b3JhZ2UgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yYWdlLm11bHRpR2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgY2FjaGVLZXlzID0gdGhpcy5pbml0aWFsT3B0aW9ucy5jYWNoZUtleXMgfHwgW107XG4gICAgICB2YXIgY29tcG9zZWRLZXlzID0gY2FjaGVLZXlzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBfdGhpcy5fY29tcG9zZUNhY2hlS2V5KGtleSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMubG9jYWxTdG9yYWdlLm11bHRpR2V0KGNvbXBvc2VkS2V5cywgZnVuY3Rpb24gKGNhY2hlKSB7XG4gICAgICAgIHZhciBwYXJzZWRDYWNoZSA9IHt9O1xuICAgICAgICBjb21wb3NlZEtleXMuZm9yRWFjaChmdW5jdGlvbiAoY29tcG9zZWRLZXksIGluZGV4KSB7XG4gICAgICAgICAgdmFyIGtleSA9IGNhY2hlS2V5c1tpbmRleF07XG4gICAgICAgICAgdmFyIGNhY2hlZFZhbHVlID0gY2FjaGVbY29tcG9zZWRLZXldO1xuICAgICAgICAgIF90aGlzLnNldChrZXksIGNhY2hlZFZhbHVlID09PSBudWxsID8gX3RoaXMuZ2V0KGtleSkgOiBjYWNoZWRWYWx1ZSk7XG4gICAgICAgICAgcGFyc2VkQ2FjaGVba2V5XSA9IGNhY2hlW2NvbXBvc2VkS2V5XTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN1Y2Nlc3MocGFyc2VkQ2FjaGUpO1xuICAgICAgfSwgZXJyb3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvcignbG9jYWxTdG9yYWdlIGlzIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgfSxcbiAgcmVJbml0OiBmdW5jdGlvbiByZUluaXQob3B0aW9ucykge1xuICAgIEpTT05EYXRhU3RvcmUuY2FsbCh0aGlzLCBvcHRpb25zIHx8IHRoaXMuaW5pdGlhbE9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBnb1RvOiBmdW5jdGlvbiBnb1RvKHBhdGgsIGFkZFVwKSB7XG4gICAgaWYgKCF0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91IGFyZSB1c2luZyBzdG9yZS5nb1RvIG91dHNpZGUgc3RvcmUuZG8hJyk7XG4gICAgfVxuICAgIGlmIChhZGRVcCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmN1cnJlbnRQYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGRvOiBmdW5jdGlvbiBfZG8obmFtZSwgYWN0aW9uLCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHRoaXMuaXNEb2luZyA9IHRydWU7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBuYW1lKHRoaXMsIGFjdGlvbiwgYSwgYiwgYywgZCwgZSwgZik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYWN0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhY3Rpb24odGhpcywgYSwgYiwgYywgZCwgZSwgZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwYXJhbWV0ZXIgYWN0aW9uLicpO1xuICAgIH1cbiAgICAvLyBjb21wb3NlIHJlc3VsdFxuICAgIHJlc3VsdC5wYXRjaGVzID0gdGhpcy5wYXRjaGVzO1xuICAgIHJlc3VsdC5yZWxhdGl2ZVBhdGNoZXMgPSB0aGlzLnJlbGF0aXZlUGF0Y2hlcztcbiAgICByZXN1bHQuYmFja1BhdGNoZXMgPSB0aGlzLmJhY2tQYXRjaGVzO1xuICAgIC8vIHJlc2V0ICdkbycgYWJvdXQgYXR0cmlidXRlc1xuICAgIHRoaXMucGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzID0gW107XG4gICAgdGhpcy5iYWNrUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSBbXTtcbiAgICB0aGlzLmlzRG9pbmcgPSBmYWxzZTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICBhZGQ6IGZ1bmN0aW9uIGFkZChwYXRoLCB2YWx1ZSwga2V5LCBwYXJlbnRQYXRoKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gcGFyZW50UGF0aCAhPT0gdW5kZWZpbmVkID8gcGFyZW50UGF0aCA6IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciByZWYgPSB2b2lkIDAsXG4gICAgICAgIHJlZlR5cGUgPSB2b2lkIDA7XG4gICAgcGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghcGF0aCB8fCAhdXRpbHMuaXNSZWZlcmVuY2VUeXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgKHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZikpID09PSAnb2JqZWN0JyAmJiAhdXRpbHMuaXNDb21tb25LZXlUeXBlKGtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUFkZCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIHZhbHVlLCBrZXkpKTtcbiAgICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoLmNvbmNhdChrZXkpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlZltrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5LnBhcnNlQXJyYXlJbmRleChrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVmLnNwbGljZShpbmRleCwgMCwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVmLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUocGF0aCwgcGFyZW50UGF0aCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHBhcmVudFBhdGggIT09IHVuZGVmaW5lZCA/IHBhcmVudFBhdGggOiB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHBhdGgpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCkpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpLCB0cnVlKSk7XG4gICAgfVxuICAgIGlmIChwYXRoLmxlbmd0aCA8IDEpIHtcbiAgICAgIHRoaXMuc3RvcmUgPSB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdmFyIGxhc3RLZXkgPSBwYXRoLnBvcCgpLFxuICAgICAgICByZWYgPSB0aGlzLl9nZXRSZWYocGF0aCksXG4gICAgICAgIHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZik7XG4gICAgaWYgKHJlZlR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHJlZi5zcGxpY2UobGFzdEtleSwgMSk7XG4gICAgfSBlbHNlIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgZGVsZXRlIHJlZltsYXN0S2V5XTtcbiAgICB9XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHBhdGgsIHZhbHVlLCBmb3JjZVVwZGF0ZSwgcGFyZW50UGF0aCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHBhcmVudFBhdGggIT09IHVuZGVmaW5lZCA/IHBhcmVudFBhdGggOiB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICBwYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIGxhc3RLZXkgPSB2b2lkIDAsXG4gICAgICAgIGZ1bGxQYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKGZ1bGxQYXRoKSB7XG4gICAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUoZnVsbFBhdGgsIHZhbHVlKSk7XG4gICAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgoZnVsbFBhdGgpLCB2YWx1ZSkpO1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShmdWxsUGF0aCwgdGhpcy5nZXQoZnVsbFBhdGgpKSk7XG4gICAgICB9XG4gICAgICBsYXN0S2V5ID0gZnVsbFBhdGgucG9wKCk7XG4gICAgICBpZiAobGFzdEtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2dldFJlZihmdWxsUGF0aClbbGFzdEtleV0gPSB2YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc3RvcmUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIGlmIChmb3JjZVVwZGF0ZSA9PT0gdHJ1ZSAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIGxhc3RLZXkgPSBwYXRoLnBvcCgpO1xuICAgICAgcmV0dXJuIHRoaXMuYWRkKHBhdGgsIHZhbHVlLCBsYXN0S2V5LCB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbiBzZXQocGF0aCwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUocGF0aCwgdmFsdWUsIHRydWUsIHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpKTtcbiAgfSxcbiAgbW92ZVVwOiBmdW5jdGlvbiBtb3ZlVXAocGF0aCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHJldHVybiB0aGlzLl9tb3ZlQXJyYXlJdGVtKHBhdGgsIHRydWUpO1xuICB9LFxuICBtb3ZlRG93bjogZnVuY3Rpb24gbW92ZURvd24ocGF0aCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHJldHVybiB0aGlzLl9tb3ZlQXJyYXlJdGVtKHBhdGgpO1xuICB9LFxuICBtb3ZlVG86IGZ1bmN0aW9uIG1vdmVUbyhmcm9tLCB0bywga2V5KSB7XG4gICAgdmFyIHBhcmVudEZyb21QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChmcm9tLCBmYWxzZSksXG4gICAgICAgIHBhcmVudFRvUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodG8sIGZhbHNlKTtcbiAgICBmcm9tID0gdGhpcy5fZ2V0RnVsbFBhdGgoZnJvbSk7XG4gICAgdG8gPSB0aGlzLl9nZXRGdWxsUGF0aCh0byk7XG4gICAgaWYgKCFmcm9tIHx8ICF0byB8fCAhdXRpbHMuaXNSZWZlcmVuY2VUeXBlKHRoaXMuX2dldFJlZih0bykpKSByZXR1cm4gdGhpcztcbiAgICB0aGlzLmFkZCh0bywgdGhpcy5fZ2V0UmVmKGZyb20pLCBrZXksIHBhcmVudFRvUGF0aCk7XG4gICAgdGhpcy5yZW1vdmUoZnJvbSwgcGFyZW50RnJvbVBhdGgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBleGNoYW5nZTogZnVuY3Rpb24gZXhjaGFuZ2UoZnJvbSwgdG8pIHtcbiAgICB2YXIgcGFyZW50RnJvbVBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKGZyb20sIGZhbHNlKSxcbiAgICAgICAgcGFyZW50VG9QYXRoID0gdGhpcy5fZm9ybWF0UGF0aCh0bywgZmFsc2UpO1xuICAgIGZyb20gPSB0aGlzLl9nZXRGdWxsUGF0aChmcm9tKTtcbiAgICB0byA9IHRoaXMuX2dldEZ1bGxQYXRoKHRvKTtcbiAgICBpZiAoZnJvbSAmJiB0bykge1xuICAgICAgdmFyIGZyb21SZWYgPSB0aGlzLl9nZXRSZWYoZnJvbSksXG4gICAgICAgICAgdG9SZWYgPSB0aGlzLmdldCh0byk7XG4gICAgICB0aGlzLnVwZGF0ZShmcm9tLCB0b1JlZiwgZmFsc2UsIHBhcmVudEZyb21QYXRoKTtcbiAgICAgIHRoaXMudXBkYXRlKHRvLCBmcm9tUmVmLCBmYWxzZSwgcGFyZW50VG9QYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGV4dGVuZE9iamVjdDogZnVuY3Rpb24gZXh0ZW5kT2JqZWN0KHBhdGgsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgcmVmID0gdm9pZCAwO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkgfHwgdXRpbHMudHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpICE9PSAnb2JqZWN0JykgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUV4dGVuZE9iamVjdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUV4dGVuZE9iamVjdCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGEsIGIsIGMsIGQsIGUsIGYpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIG9iamVjdC5leHRlbmQocmVmLCBhLCBiLCBjLCBkLCBlLCBmKTtcbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkQXJyYXk6IGZ1bmN0aW9uIHNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgcmVmID0gdm9pZCAwO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkgfHwgdXRpbHMudHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpICE9PSAnYXJyYXknKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSB0eXBlb2YgYmVnaW4gPT09ICdudW1iZXInID8gYmVnaW4gOiByZWYubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWRBcnJheSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZEFycmF5KHJlZiwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCk7XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlSb3c6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgcmVmID0gdm9pZCAwO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkgfHwgIWFycmF5LmlzMmRBcnJheShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8ICEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gdHlwZW9mIGJlZ2luID09PSAnbnVtYmVyJyA/IGJlZ2luIDogcmVmLmxlbmd0aDtcbiAgICBpZiAoISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkMmRBcnJheVJvdyh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBhcnJheS5zcHJlYWQyZEFycmF5Um93KHJlZiwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpO1xuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzcHJlYWQyZEFycmF5Q29sOiBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8ICFhcnJheS5pczJkQXJyYXkocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAhKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHR5cGVvZiBiZWdpbiA9PT0gJ251bWJlcicgPyBiZWdpbiA6IHJlZlswXS5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkMmRBcnJheUNvbChyZWYsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KTtcbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQocGF0aCkge1xuICAgIGlmIChwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvcHlTdG9yZSA/IHV0aWxzLmNvcHkodGhpcy5fZ2V0UmVmKHBhdGgpKSA6IHRoaXMuX2dldFJlZihwYXRoKTtcbiAgICB9XG4gIH0sXG4gIHBhdGNoOiBmdW5jdGlvbiBwYXRjaCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgbWV0aG9kIGlzIGRlcHJlY2F0ZWQsIHVzZSBKU09OU3RvcmUucGF0Y2ggaW5zdGVhZC4nKTtcbiAgfSxcbiAgYXBwbHlQYXRjaDogZnVuY3Rpb24gYXBwbHlQYXRjaChwYXRjaGVzKSB7XG4gICAgcGF0Y2hlcyA9IHV0aWxzLnR5cGUocGF0Y2hlcykgPT09ICdhcnJheScgPyBwYXRjaGVzIDogW3BhdGNoZXNdO1xuICAgIHBhdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAocGF0Y2gpIHtcbiAgICAgIHRoaXNbcGF0Y2gudHlwZV0uYXBwbHkodGhpcywgcGF0Y2guYXJncyk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcblxuSlNPTkRhdGFTdG9yZS5QYXRjaCA9IHBhdGNoTWV0aG9kcztcblxubW9kdWxlLmV4cG9ydHMgPSBKU09ORGF0YVN0b3JlOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGF0aExpc3RlbmVyKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMuZGVlcEVxdWFsID0gb3B0aW9ucy5kZWVwRXF1YWwgPT09IHRydWU7XG4gIHRoaXMuY29weVN0b3JlID0gb3B0aW9ucy5jb3B5U3RvcmU7XG4gIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gIHRoaXMuZ3JvdXBSZWZzID0ge307XG4gIHRoaXMuc3RvcmUgPSBvcHRpb25zLnN0b3JlIHx8IHt9O1xuICB0aGlzLmZsYXNoS2V5cyA9IG9wdGlvbnMuZmxhc2hLZXlzIHx8IHt9O1xufVxuXG5QYXRoTGlzdGVuZXIucHJvdG90eXBlID0ge1xuICBfY29weURhdGE6IGZ1bmN0aW9uIF9jb3B5RGF0YShkYXRhKSB7XG4gICAgaWYgKGRhdGEgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGRhdGE7XG4gICAgcmV0dXJuIHRoaXMuY29weVN0b3JlID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSkgOiBkYXRhO1xuICB9LFxuICBfcmVtb3ZlTGlzdGVuZXI6IGZ1bmN0aW9uIF9yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcnMsIGNiKSB7XG4gICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YoY2IpO1xuICAgIGluZGV4ID4gLTEgJiYgKGxpc3RlbmVyc1tpbmRleF0gPSBudWxsKTtcbiAgICByZXR1cm4gaW5kZXg7XG4gIH0sXG4gIHJlZ2lzdGVyTGlzdGVuZXI6IGZ1bmN0aW9uIHJlZ2lzdGVyTGlzdGVuZXIocGF0aCwgY2IsIGdyb3VwLCBjaGVjaykge1xuICAgIGdyb3VwID0gdHlwZW9mIGdyb3VwID09PSAnc3RyaW5nJyA/IGdyb3VwIDogbnVsbDtcbiAgICBjaGVjayA9IGdyb3VwID09PSBudWxsID8gZ3JvdXAgIT09IGZhbHNlIDogY2hlY2sgIT09IGZhbHNlO1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHBhdGhJdGVtID0gdm9pZCAwLFxuICAgICAgICB0cmVlUmVmID0gdGhpcy5saXN0ZW5lclRyZWUsXG4gICAgICAgIGxpc3RlbmVySW5kZXggPSB2b2lkIDA7XG4gICAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICAgIHBhdGhJdGVtID0gcGF0aFtpKytdO1xuICAgICAgaWYgKHRyZWVSZWZbcGF0aEl0ZW1dID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJlZVJlZltwYXRoSXRlbV0gPSB7IGNoaWxkcmVuOiB7fSwgbGlzdGVuZXJzOiBbXSB9O1xuICAgICAgfVxuICAgICAgdHJlZVJlZiA9IGkgPT09IGxlbiA/IHRyZWVSZWZbcGF0aEl0ZW1dIDogdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIGxpc3RlbmVySW5kZXggPSB0cmVlUmVmLmxpc3RlbmVycy5pbmRleE9mKGNiKTtcbiAgICBsaXN0ZW5lckluZGV4ID0gbGlzdGVuZXJJbmRleCA9PT0gLTEgPyB0cmVlUmVmLmxpc3RlbmVycy5wdXNoKGNiKSAtIDEgOiBsaXN0ZW5lckluZGV4O1xuICAgIGlmIChncm91cCAhPT0gbnVsbCkge1xuICAgICAgaWYgKHRoaXMuZ3JvdXBSZWZzW2dyb3VwXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBSZWZzW2dyb3VwXSA9IFtdO1xuICAgICAgfVxuICAgICAgdGhpcy5ncm91cFJlZnNbZ3JvdXBdLnB1c2goW3RyZWVSZWYubGlzdGVuZXJzLCBsaXN0ZW5lckluZGV4XSk7XG4gICAgfVxuICAgIGlmIChjaGVjaykge1xuICAgICAgdGhpcy5jaGVja1BhdGgocGF0aCk7XG4gICAgfVxuICB9LFxuICBjaGVja1BhdGg6IGZ1bmN0aW9uIGNoZWNrUGF0aChwYXRoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHBhdGhJdGVtID0gdm9pZCAwLFxuICAgICAgICB0cmVlUmVmID0gdGhpcy5saXN0ZW5lclRyZWUsXG4gICAgICAgIGRhdGFSZWYgPSB0aGlzLnN0b3JlO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBpZiAoZGF0YVJlZiA9PT0gdW5kZWZpbmVkKSBicmVhaztcbiAgICAgIHBhdGhJdGVtID0gcGF0aFtpKytdO1xuICAgICAgZGF0YVJlZiA9IGRhdGFSZWZbcGF0aEl0ZW1dO1xuICAgICAgaWYgKHRyZWVSZWZbcGF0aEl0ZW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJlZVJlZltwYXRoSXRlbV0ubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgdHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nICYmIGxpc3RlbmVyKF90aGlzLl9jb3B5RGF0YShkYXRhUmVmKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0cmVlUmVmID0gdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmZsYXNoS2V5c1twYXRoWzBdXSkge1xuICAgICAgdGhpcy5zdG9yZVtwYXRoWzBdXSA9IG51bGw7XG4gICAgfVxuICB9LFxuICByZW1vdmVBbGxMaXN0ZW5lcnM6IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycygpIHtcbiAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgIHRoaXMuZ3JvdXBSZWZzID0ge307XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlQYXRoOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYikge1xuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aCxcbiAgICAgICAgcGF0aEl0ZW0gPSB2b2lkIDAsXG4gICAgICAgIHRyZWVSZWYgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgcGF0aEl0ZW0gPSBwYXRoW2krK107XG4gICAgICBpZiAodHJlZVJlZltwYXRoSXRlbV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgdHJlZVJlZiA9IGkgPT09IGxlbiA/IHRyZWVSZWZbcGF0aEl0ZW1dIDogdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVyKHRyZWVSZWYubGlzdGVuZXJzLCBjYik7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlHcm91cDogZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKSB7XG4gICAgdmFyIGdyb3VwTGlzdGVuZXJzID0gdGhpcy5ncm91cFJlZnNbZ3JvdXBdO1xuICAgIGlmIChncm91cExpc3RlbmVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBncm91cExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyKSB7XG4gICAgICAgIHR5cGVvZiBwYWlyWzBdW3BhaXJbMV1dID09PSAnZnVuY3Rpb24nICYmIChwYWlyWzBdW3BhaXJbMV1dID0gbnVsbCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGF0aExpc3RlbmVyOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgc3BsaWNlID0gQXJyYXkucHJvdG90eXBlLnNwbGljZTtcblxudmFyIGNyZWF0ZUFycmF5ID0gZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoLCBpbmZpbGxpbmcpIHtcbiAgbGVuZ3RoID0gbGVuZ3RoIHx8IDA7XG4gIHZhciBhcnIgPSBbXSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgYXJyLnB1c2goaW5maWxsaW5nID09PSB1bmRlZmluZWQgPyBudWxsIDogdXRpbHMuY29weShpbmZpbGxpbmcpKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudmFyIGlzMmRBcnJheSA9IGZ1bmN0aW9uIGlzMmRBcnJheShhcnIpIHtcbiAgdmFyIGlzMmQ7XG4gIGlmIChpczJkID0gdXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknICYmIGFyci5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBhcnIubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlzMmQgJj0gdXRpbHMudHlwZShhcnJbaV0pID09PSAnYXJyYXknO1xuICAgICAgaWYgKCFpczJkKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjcmVhdGUyZEFycmF5ID0gZnVuY3Rpb24gY3JlYXRlMmRBcnJheShyb3csIGNvbCwgaW5maWxsaW5nKSB7XG4gIHJvdyA9IHJvdyB8fCAwO1xuICBjb2wgPSBjb2wgfHwgMDtcbiAgdmFyIGFyciA9IG5ldyBBcnJheShyb3cpLFxuICAgICAgaSA9IDA7XG4gIGZvciAoOyBpIDwgcm93OyBpKyspIHtcbiAgICBhcnJbaV0gPSBjcmVhdGVBcnJheShjb2wsIGluZmlsbGluZyk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBwYXJzZUFycmF5SW5kZXggPSBmdW5jdGlvbiBwYXJzZUFycmF5SW5kZXgoaW5kZXgpIHtcbiAgdmFyIHR5cGUgPSB1dGlscy50eXBlKGluZGV4KTtcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnIHx8IHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHBhcnNlSW50KGluZGV4KTtcbiAgfVxuICByZXR1cm4gdm9pZCAwO1xufTtcblxudmFyIGdldEFycmF5SW5kZXhCeVZhbHVlID0gZnVuY3Rpb24gZ2V0QXJyYXlJbmRleEJ5VmFsdWUoYXJyLCB2YWx1ZSkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIHZhbHVlVHlwZSA9IHV0aWxzLnR5cGUodmFsdWUpO1xuICAgIGlmICh2YWx1ZVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgbGVuID0gYXJyLmxlbmd0aCxcbiAgICAgICAgICBpdGVtO1xuICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpdGVtID0gYXJyW2ldO1xuICAgICAgICB2YXIgaXNFcXVhbCA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaXNFcXVhbCA9IGl0ZW1ba2V5XSA9PT0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIGlmICghaXNFcXVhbCkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0VxdWFsKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFyci5pbmRleE9mKHZhbHVlKTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtVXAgPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtVXAoYXJyLCBpbmRleCkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgaW5kZXggPSBwYXJzZUFycmF5SW5kZXgoaW5kZXgpO1xuICAgIHZhciBjdXJySXRlbSA9IGFycltpbmRleF07XG4gICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCAtIDFdO1xuICAgICAgYXJyW2luZGV4IC0gMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtRG93biA9IGZ1bmN0aW9uIG1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA8IGFyci5sZW5ndGggLSAxKSB7XG4gICAgICBhcnJbaW5kZXhdID0gYXJyW2luZGV4ICsgMV07XG4gICAgICBhcnJbaW5kZXggKyAxXSA9IGN1cnJJdGVtO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHNwcmVhZEFycmF5ID0gZnVuY3Rpb24gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gIHZhciBkZWxldGVkID0gW107XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICB2YXIgaW5maWxsaW5nVHlwZSA9IHV0aWxzLnR5cGUoaW5maWxsaW5nKTtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChjcmVhdGVBcnJheShwYXJzZUludChjb3VudCkgfHwgMSwgaW5maWxsaW5nKSkpO1xuICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoaW5maWxsaW5nKSk7XG4gICAgfSBlbHNlIGlmIChpbmZpbGxpbmdUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKGluZmlsbGluZyA+IDApIHtcbiAgICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoY3JlYXRlQXJyYXkoaW5maWxsaW5nKSkpO1xuICAgICAgfSBlbHNlIGlmIChpbmZpbGxpbmcgPCAwKSB7XG4gICAgICAgIGRlbGV0ZWQgPSBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIE1hdGguYWJzKGluZmlsbGluZyldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG52YXIgc3ByZWFkMmRBcnJheVJvdyA9IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3coYXJyLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICB2YXIgZGVsZXRlZCA9IFtdLFxuICAgICAgcm93c1R5cGUgPSB1dGlscy50eXBlKHJvd3MpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgY29sQ291bnQgPSBhcnJbMF0ubGVuZ3RoO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGNyZWF0ZUFycmF5KGNvbENvdW50LCByb3dzKSwgdHJ1ZSwgY291bnQpO1xuICAgIH0gZWxzZSBpZiAocm93c1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAocm93cyA+IDApIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgY3JlYXRlMmRBcnJheShyb3dzLCBjb2xDb3VudCkpO1xuICAgICAgfSBlbHNlIGlmIChyb3dzIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyb3dzVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlDb2wgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Q29sKGFyciwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIGRlbGV0ZWRDb2wsXG4gICAgICBjb2xzVHlwZSA9IHV0aWxzLnR5cGUoY29scyk7XG4gIGlmIChpczJkQXJyYXkoYXJyKSkge1xuICAgIHZhciByb3dDb3VudCA9IGFyci5sZW5ndGgsXG4gICAgICAgIGkgPSAwO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzLCB0cnVlLCBjb3VudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xzVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBkZWxldGVkQ29sID0gc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29scyk7XG4gICAgICAgIGlmIChkZWxldGVkQ29sLmxlbmd0aCkge1xuICAgICAgICAgIGRlbGV0ZWQucHVzaChkZWxldGVkQ29sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sc1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXMyZEFycmF5OiBpczJkQXJyYXksXG4gIGNyZWF0ZUFycmF5OiBjcmVhdGVBcnJheSxcbiAgY3JlYXRlMmRBcnJheTogY3JlYXRlMmRBcnJheSxcbiAgcGFyc2VBcnJheUluZGV4OiBwYXJzZUFycmF5SW5kZXgsXG4gIGdldEFycmF5SW5kZXhCeVZhbHVlOiBnZXRBcnJheUluZGV4QnlWYWx1ZSxcbiAgbW92ZUFycmF5SXRlbVVwOiBtb3ZlQXJyYXlJdGVtVXAsXG4gIG1vdmVBcnJheUl0ZW1Eb3duOiBtb3ZlQXJyYXlJdGVtRG93bixcbiAgc3ByZWFkQXJyYXk6IHNwcmVhZEFycmF5LFxuICBzcHJlYWQyZEFycmF5Um93OiBzcHJlYWQyZEFycmF5Um93LFxuICBzcHJlYWQyZEFycmF5Q29sOiBzcHJlYWQyZEFycmF5Q29sXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZ2V0T2JqZWN0S2V5QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldE9iamVjdEtleUJ5VmFsdWUob2JqLCB2YWx1ZSkge1xuICB2YXIgb2JqS2V5LCBvYmpWYWx1ZSwgdmFsdWVLZXk7XG4gIGlmICh1dGlscy50eXBlKHZhbHVlKSA9PT0gJ29iamVjdCcpIHtcbiAgICBvdXRlcjogZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgdXRpbHMudHlwZShvYmpWYWx1ZSA9IG9ialtvYmpLZXldKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YWx1ZUtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eSh2YWx1ZUtleSkgJiYgdmFsdWVbdmFsdWVLZXldICE9PSBvYmpWYWx1ZVt2YWx1ZUtleV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqS2V5O1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKG9iaktleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkob2JqS2V5KSAmJiBvYmpbb2JqS2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG4gIHZhciB0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG4gICAgICBhcmdMZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ0xlbjsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSxcbiAgICAgICAga2V5O1xuICAgIGlmICh1dGlscy50eXBlKHNvdXJjZSkgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB1dGlscy5jb3B5KHNvdXJjZVtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGhhc093blByb3BlcnR5OiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgZ2V0T2JqZWN0S2V5QnlWYWx1ZTogZ2V0T2JqZWN0S2V5QnlWYWx1ZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHBhdGNoVHlwZXMgPSB7XG4gIGFkZDogJ2FkZCcsXG4gIHJlbW92ZTogJ3JlbW92ZScsXG4gIHVwZGF0ZTogJ3VwZGF0ZScsXG4gIHNldDogJ3NldCcsXG4gIG1vdmVVcDogJ21vdmVVcCcsXG4gIG1vdmVEb3duOiAnbW92ZURvd24nLFxuICBtb3ZlVG86ICdtb3ZlVG8nLFxuICBleGNoYW5nZTogJ2V4Y2hhbmdlJyxcbiAgZXh0ZW5kT2JqZWN0OiAnZXh0ZW5kT2JqZWN0JyxcbiAgc3ByZWFkQXJyYXk6ICdzcHJlYWRBcnJheScsXG4gIHNwcmVhZDJkQXJyYXlDb2w6ICdzcHJlYWQyZEFycmF5Q29sJyxcbiAgc3ByZWFkMmRBcnJheVJvdzogJ3NwcmVhZDJkQXJyYXlSb3cnXG59O1xuXG52YXIgY3JlYXRlUGF0Y2ggPSBmdW5jdGlvbiBjcmVhdGVQYXRjaCh0eXBlLCBhcmdzKSB7XG4gIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKTtcbiAgcmV0dXJuIHV0aWxzLmNvcHkoe1xuICAgIHR5cGU6IHR5cGUsXG4gICAgYXJnczogYXJnc1xuICB9KTtcbn07XG5cbi8qKlxuICogY3JlYXRlIHBhdGNoIG9wZXJhdGlvbnNcbiAqICovXG5cbnZhciBwYXRjaE1ldGhvZHMgPSB7XG4gIGNyZWF0ZUFkZDogZnVuY3Rpb24gY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5hZGQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVJlbW92ZTogZnVuY3Rpb24gY3JlYXRlUmVtb3ZlKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5yZW1vdmUsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVVwZGF0ZTogZnVuY3Rpb24gY3JlYXRlVXBkYXRlKHBhdGgsIHZhbHVlLCBmb3JjZVVwZGF0ZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnVwZGF0ZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU2V0OiBmdW5jdGlvbiBjcmVhdGVTZXQocGF0aCwgdmFsdWUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zZXQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVVcDogZnVuY3Rpb24gY3JlYXRlTW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVXAsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVEb3duOiBmdW5jdGlvbiBjcmVhdGVNb3ZlRG93bihwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZURvd24sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVUbzogZnVuY3Rpb24gY3JlYXRlTW92ZVRvKGZyb20sIHRvLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVG8sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZUV4Y2hhbmdlOiBmdW5jdGlvbiBjcmVhdGVFeGNoYW5nZShmcm9tLCB0bykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4Y2hhbmdlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGNyZWF0ZUV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuZXh0ZW5kT2JqZWN0LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWRBcnJheTogZnVuY3Rpb24gY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZEFycmF5LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBjcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc3ByZWFkMmRBcnJheVJvdywgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlDb2wsIGFyZ3VtZW50cyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hNZXRob2RzOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlZmVyZW5jZVR5cGVzID0ge1xuICAnYXJyYXknOiB0cnVlLFxuICAnb2JqZWN0JzogdHJ1ZVxufTtcblxudmFyIGNvbW1vbktleVR5cGVzID0ge1xuICAnc3RyaW5nJzogdHJ1ZSxcbiAgJ251bWJlcic6IHRydWVcbn07XG5cbnZhciB0eXBlID0gZnVuY3Rpb24gdHlwZShkYXRhKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0YSkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG52YXIgaXNSZWZlcmVuY2VUeXBlID0gZnVuY3Rpb24gaXNSZWZlcmVuY2VUeXBlKGRhdGEpIHtcbiAgcmV0dXJuIHJlZmVyZW5jZVR5cGVzW3R5cGUoZGF0YSldIHx8IGZhbHNlO1xufTtcblxudmFyIGlzQ29tbW9uS2V5VHlwZSA9IGZ1bmN0aW9uIGlzQ29tbW9uS2V5VHlwZShrZXkpIHtcbiAgcmV0dXJuIGNvbW1vbktleVR5cGVzW3R5cGUoa2V5KV0gfHwgZmFsc2U7XG59O1xuXG52YXIgY29weSA9IGZ1bmN0aW9uIGNvcHkoZGF0YSkge1xuICByZXR1cm4gaXNSZWZlcmVuY2VUeXBlKGRhdGEpID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSkgOiBkYXRhO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHR5cGU6IHR5cGUsXG4gIGNvcHk6IGNvcHksXG4gIGlzUmVmZXJlbmNlVHlwZTogaXNSZWZlcmVuY2VUeXBlLFxuICBpc0NvbW1vbktleVR5cGU6IGlzQ29tbW9uS2V5VHlwZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvSlNPTkRhdGFTdG9yZScpOyJdfQ==
