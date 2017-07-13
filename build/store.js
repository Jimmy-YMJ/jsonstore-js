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
    var i = 0,
        len = listeners.length;
    while (i < len) {
      if (listeners[i] === cb) {
        listeners[i] = null;
      }
      i++;
    }
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
    listenerIndex = treeRef.listeners.push(cb) - 1;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9KU09ORGF0YVN0b3JlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvUGF0aExpc3RlbmVyLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9wYXRjaC5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBvcHRpb25zOlxuICogIHN0b3JlXG4gKiAgY29weVN0b3JlXG4gKiAgY2FjaGVLZXlzXG4gKiAgbG9jYWxTdG9yYWdlXG4gKiAqKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xudmFyIG9iamVjdCA9IHJlcXVpcmUoJy4vb2JqZWN0Jyk7XG52YXIgcGF0Y2hNZXRob2RzID0gcmVxdWlyZSgnLi9wYXRjaCcpO1xudmFyIFBhdGhMaXN0ZW5lciA9IHJlcXVpcmUoJy4vUGF0aExpc3RlbmVyJyk7XG52YXIgSlNPTl9TVE9SRV9DQUNIRV9LRVlfUFJFRklYID0gJ0pTT05fU1RPUkVfQ0FDSEVfS0VZX1BSRUZJWCc7XG52YXIgZW1wdHlGdW5jID0gZnVuY3Rpb24gZW1wdHlGdW5jKCkge307XG5cbmZ1bmN0aW9uIEpTT05EYXRhU3RvcmUob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5pbml0aWFsT3B0aW9ucyA9IHV0aWxzLmNvcHkob3B0aW9ucyk7XG4gIHZhciBzdG9yZSA9IG9wdGlvbnMuc3RvcmUsXG4gICAgICBjb3B5U3RvcmUgPSBvcHRpb25zLmNvcHlTdG9yZSAhPT0gZmFsc2U7XG4gIHRoaXMuY29weVN0b3JlID0gY29weVN0b3JlO1xuICB0aGlzLnN0b3JlID0gY29weVN0b3JlID8gdXRpbHMuY29weShzdG9yZSkgOiBzdG9yZTtcbiAgdGhpcy5jYWNoZUtleXMgPSB0aGlzLl9nZXRTdG9yZUtleXNNYXAob3B0aW9ucy5jYWNoZUtleXMsIHRoaXMuc3RvcmUpO1xuICB0aGlzLmZsYXNoS2V5cyA9IHRoaXMuX2dldFN0b3JlS2V5c01hcChvcHRpb25zLmZsYXNoS2V5cywgdGhpcy5zdG9yZSk7XG4gIHRoaXMuY2FjaGVLZXlQcmVmaXggPSBvcHRpb25zLmNhY2hlS2V5UHJlZml4IHx8IEpTT05fU1RPUkVfQ0FDSEVfS0VZX1BSRUZJWDtcbiAgdGhpcy5sb2NhbFN0b3JhZ2UgPSBvcHRpb25zLmxvY2FsU3RvcmFnZTtcbiAgLy8gJ2RvJyBhYm91dCBhdHRyaWJ1dGVzXG4gIHRoaXMucGF0Y2hlcyA9IFtdO1xuICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICB0aGlzLmJhY2tQYXRjaGVzID0gW107XG4gIHRoaXMuY3VycmVudFBhdGggPSBbXTtcbiAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG4gIHRoaXMucGF0aExpc3RlbmVyID0gbmV3IFBhdGhMaXN0ZW5lcih7IHN0b3JlOiB0aGlzLnN0b3JlLCBjb3B5U3RvcmU6IGNvcHlTdG9yZSwgZmxhc2hLZXlzOiB0aGlzLmZsYXNoS2V5cyB9KTtcbiAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gW107XG59XG5cbkpTT05EYXRhU3RvcmUucHJvdG90eXBlID0ge1xuICBfc3RvcmVVcGRhdGVkOiBmdW5jdGlvbiBfc3RvcmVVcGRhdGVkKCkge1xuICAgIHRoaXMuX3VwZGF0ZUNhY2hlKHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aFswXSk7XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIuY2hlY2tQYXRoKHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCk7XG4gIH0sXG4gIF9nZXRTdG9yZUtleXNNYXA6IGZ1bmN0aW9uIF9nZXRTdG9yZUtleXNNYXAoa2V5cywgc3RvcmUpIHtcbiAgICB2YXIga2V5c01hcCA9IHt9O1xuICAgIGlmICh1dGlscy50eXBlKGtleXMpID09PSAnYXJyYXknKSB7XG4gICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoc3RvcmUsIGtleSkpIHtcbiAgICAgICAgICBrZXlzTWFwW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGtleXNNYXA7XG4gIH0sXG4gIF9nZXRSZWY6IGZ1bmN0aW9uIF9nZXRSZWYocGF0aCkge1xuICAgIHZhciByZWYgPSB0aGlzLnN0b3JlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgcmVmID0gcmVmW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gcmVmO1xuICB9LFxuICBfZGV0ZWN0UGF0aDogZnVuY3Rpb24gX2RldGVjdFBhdGgocGF0aCkge1xuICAgIHZhciBkZXRlY3RlZCA9IFtdLFxuICAgICAgICByZWYgPSB0aGlzLnN0b3JlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIGtleSA9IHZvaWQgMCxcbiAgICAgICAga2V5VHlwZSA9IHZvaWQgMCxcbiAgICAgICAgcmVmVHlwZSA9IHZvaWQgMDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrZXkgPSBwYXRoW2ldO1xuICAgICAga2V5VHlwZSA9IHV0aWxzLnR5cGUoa2V5KTtcbiAgICAgIHJlZlR5cGUgPSB1dGlscy50eXBlKHJlZik7XG4gICAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGtleSwgJ19fdmFsdWUnKSkge1xuICAgICAgICAgIHZhciBvYmpLZXkgPSBvYmplY3QuZ2V0T2JqZWN0S2V5QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAob2JqS2V5KSB7XG4gICAgICAgICAgICByZWYgPSByZWZbb2JqS2V5XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2gob2JqS2V5KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChyZWYsIGtleSkpIHtcbiAgICAgICAgICByZWYgPSByZWZba2V5XTtcbiAgICAgICAgICBkZXRlY3RlZC5wdXNoKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdhcnJheScpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKGtleSwgJ19fdmFsdWUnKSkge1xuICAgICAgICAgIHZhciBpbmRleCA9IGFycmF5LmdldEFycmF5SW5kZXhCeVZhbHVlKHJlZiwga2V5Ll9fdmFsdWUpO1xuICAgICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgICByZWYgPSByZWZbaW5kZXhdO1xuICAgICAgICAgICAgZGV0ZWN0ZWQucHVzaChpbmRleCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGV0ZWN0ZWQ7XG4gIH0sXG4gIF9mb3JtYXRQYXRoOiBmdW5jdGlvbiBfZm9ybWF0UGF0aChwYXRoLCBkZXRlY3QpIHtcbiAgICB2YXIgcGF0aFR5cGUgPSB1dGlscy50eXBlKHBhdGgpO1xuICAgIGlmIChwYXRoVHlwZSA9PT0gJ3VuZGVmaW5lZCcgfHwgcGF0aFR5cGUgPT09ICdudWxsJykge1xuICAgICAgcGF0aCA9IFtdO1xuICAgIH0gZWxzZSBpZiAocGF0aFR5cGUgIT09ICdhcnJheScpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfVxuICAgIGlmIChkZXRlY3QgIT09IGZhbHNlKSB7XG4gICAgICB2YXIgZGV0ZWN0ZWQgPSB0aGlzLl9kZXRlY3RQYXRoKHBhdGgpO1xuICAgICAgaWYgKGRldGVjdGVkLmxlbmd0aCA9PT0gcGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGRldGVjdGVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnNsaWNlKCk7XG4gIH0sXG4gIF9tb3ZlQXJyYXlJdGVtOiBmdW5jdGlvbiBfbW92ZUFycmF5SXRlbShwYXRoLCBtb3ZlVXApIHtcbiAgICB2YXIgZnVsbFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICBpZiAoIWZ1bGxQYXRoIHx8IGZ1bGxQYXRoLmxlbmd0aCA8IDEpIHJldHVybiB0aGlzO1xuICAgIHZhciBpdGVtSW5kZXggPSBmdWxsUGF0aC5wb3AoKSxcbiAgICAgICAgYXJyID0gdGhpcy5fZ2V0UmVmKGZ1bGxQYXRoKTtcbiAgICBpZiAodXRpbHMudHlwZShhcnIpICE9PSAnYXJyYXknKSByZXR1cm4gdGhpcztcbiAgICB2YXIgbWV0aG9kID0gbW92ZVVwID09PSB0cnVlID8gJ2NyZWF0ZU1vdmVVcCcgOiAnY3JlYXRlTW92ZURvd24nLFxuICAgICAgICByZXZlcnNlTWV0aG9kID0gbWV0aG9kID09PSAnY3JlYXRlTW92ZVVwJyA/ICdjcmVhdGVNb3ZlRG93bicgOiAnY3JlYXRlTW92ZVVwJztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHNbbWV0aG9kXShmdWxsUGF0aC5jb25jYXQoaXRlbUluZGV4KSkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHNbbWV0aG9kXSh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgoZnVsbFBhdGguY29uY2F0KGl0ZW1JbmRleCkpKSk7XG4gICAgICBpZiAobW92ZVVwID09PSB0cnVlICYmIGl0ZW1JbmRleCA+IDAgfHwgbW92ZVVwICE9PSB0cnVlICYmIGl0ZW1JbmRleCA8IGFyci5sZW5ndGggLSAxKSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHNbcmV2ZXJzZU1ldGhvZF0oZnVsbFBhdGguY29uY2F0KG1vdmVVcCA9PT0gdHJ1ZSA/IGl0ZW1JbmRleCAtIDEgOiBpdGVtSW5kZXggKyAxKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobW92ZVVwID09PSB0cnVlKSB7XG4gICAgICBhcnJheS5tb3ZlQXJyYXlJdGVtVXAoYXJyLCBpdGVtSW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcnJheS5tb3ZlQXJyYXlJdGVtRG93bihhcnIsIGl0ZW1JbmRleCk7XG4gICAgfVxuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBfZ2V0RnVsbFBhdGg6IGZ1bmN0aW9uIF9nZXRGdWxsUGF0aChwYXRoKSB7XG4gICAgaWYgKHV0aWxzLmlzUmVmZXJlbmNlVHlwZShwYXRoKSAmJiBwYXRoLmlzRnVsbCkge1xuICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxuICAgIHZhciBjdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodGhpcy5jdXJyZW50UGF0aCwgZmFsc2UpLFxuICAgICAgICBmdWxsUGF0aCA9IGN1cnJlbnRQYXRoLmNvbmNhdCh0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKSksXG4gICAgICAgIGZvcm1hdHRlZEZ1bGxQYXRoID0gdGhpcy5fZm9ybWF0UGF0aChmdWxsUGF0aCk7XG4gICAgaWYgKGZvcm1hdHRlZEZ1bGxQYXRoKSB7XG4gICAgICBmb3JtYXR0ZWRGdWxsUGF0aC5pc0Z1bGwgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVkRnVsbFBhdGg7XG4gIH0sXG4gIF9nZXRSZWxhdGl2ZVBhdGg6IGZ1bmN0aW9uIF9nZXRSZWxhdGl2ZVBhdGgoZnVsbFBhdGgpIHtcbiAgICByZXR1cm4gZnVsbFBhdGguc2xpY2UodGhpcy5jdXJyZW50UGF0aC5sZW5ndGgpO1xuICB9LFxuICBfY29tcG9zZUNhY2hlS2V5OiBmdW5jdGlvbiBfY29tcG9zZUNhY2hlS2V5KGtleSkge1xuICAgIHJldHVybiB0aGlzLmNhY2hlS2V5UHJlZml4ICsgJ0AnICsga2V5O1xuICB9LFxuICBfdXBkYXRlQ2FjaGU6IGZ1bmN0aW9uIF91cGRhdGVDYWNoZShrZXkpIHtcbiAgICBpZiAodGhpcy5jYWNoZUtleXNba2V5XSAmJiB0aGlzLmxvY2FsU3RvcmFnZSAmJiB0eXBlb2YgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0aGlzLl9jb21wb3NlQ2FjaGVLZXkoa2V5KSwgdGhpcy5nZXQoa2V5KSk7XG4gICAgfVxuICB9LFxuICByZWdpc3RlclBhdGhMaXN0ZW5lcjogZnVuY3Rpb24gcmVnaXN0ZXJQYXRoTGlzdGVuZXIocGF0aCwgY2FsbGJhY2ssIGdyb3VwLCBjaGVjaykge1xuICAgIHBhdGggPSBBcnJheS5pc0FycmF5KHBhdGgpID8gcGF0aCA6IFtwYXRoXTtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5yZWdpc3Rlckxpc3RlbmVyKHBhdGgsIGNhbGxiYWNrLCBncm91cCwgY2hlY2spO1xuICB9LFxuICByZW1vdmVMaXN0ZW5lckJ5UGF0aDogZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJCeVBhdGgocGF0aCwgY2FsbGJhY2spIHtcbiAgICBwYXRoID0gQXJyYXkuaXNBcnJheShwYXRoKSA/IHBhdGggOiBbcGF0aF07XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIucmVtb3ZlTGlzdGVuZXJCeVBhdGgocGF0aCwgY2FsbGJhY2spO1xuICB9LFxuICByZW1vdmVMaXN0ZW5lckJ5R3JvdXA6IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyQnlHcm91cChncm91cCkge1xuICAgIHRoaXMucGF0aExpc3RlbmVyLnJlbW92ZUxpc3RlbmVyQnlHcm91cChncm91cCk7XG4gIH0sXG4gIHJlbW92ZUFsbExpc3RlbmVyczogZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKCkge1xuICAgIHRoaXMucGF0aExpc3RlbmVyLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICB9LFxuICBsb2FkQ2FjaGU6IGZ1bmN0aW9uIGxvYWRDYWNoZShzdWNjZXNzLCBlcnJvcikge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBlcnJvciA9IHR5cGVvZiBlcnJvciA9PT0gJ2Z1bmN0aW9uJyA/IGVycm9yIDogZW1wdHlGdW5jO1xuICAgIGlmICh0aGlzLmxvY2FsU3RvcmFnZSAmJiB0eXBlb2YgdGhpcy5sb2NhbFN0b3JhZ2UubXVsdGlHZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBjYWNoZUtleXMgPSB0aGlzLmluaXRpYWxPcHRpb25zLmNhY2hlS2V5cyB8fCBbXTtcbiAgICAgIHZhciBjb21wb3NlZEtleXMgPSBjYWNoZUtleXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl9jb21wb3NlQ2FjaGVLZXkoa2V5KTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5sb2NhbFN0b3JhZ2UubXVsdGlHZXQoY29tcG9zZWRLZXlzLCBmdW5jdGlvbiAoY2FjaGUpIHtcbiAgICAgICAgdmFyIHBhcnNlZENhY2hlID0ge307XG4gICAgICAgIGNvbXBvc2VkS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChjb21wb3NlZEtleSwgaW5kZXgpIHtcbiAgICAgICAgICB2YXIga2V5ID0gY2FjaGVLZXlzW2luZGV4XTtcbiAgICAgICAgICB2YXIgY2FjaGVkVmFsdWUgPSBjYWNoZVtjb21wb3NlZEtleV07XG4gICAgICAgICAgX3RoaXMuc2V0KGtleSwgY2FjaGVkVmFsdWUgPT09IG51bGwgPyBfdGhpcy5nZXQoa2V5KSA6IGNhY2hlZFZhbHVlKTtcbiAgICAgICAgICBwYXJzZWRDYWNoZVtrZXldID0gY2FjaGVbY29tcG9zZWRLZXldO1xuICAgICAgICB9KTtcbiAgICAgICAgc3VjY2VzcyhwYXJzZWRDYWNoZSk7XG4gICAgICB9LCBlcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVycm9yKCdsb2NhbFN0b3JhZ2UgaXMgdW5kZWZpbmVkJyk7XG4gICAgfVxuICB9LFxuICByZUluaXQ6IGZ1bmN0aW9uIHJlSW5pdChvcHRpb25zKSB7XG4gICAgSlNPTkRhdGFTdG9yZS5jYWxsKHRoaXMsIG9wdGlvbnMgfHwgdGhpcy5pbml0aWFsT3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGdvVG86IGZ1bmN0aW9uIGdvVG8ocGF0aCwgYWRkVXApIHtcbiAgICBpZiAoIXRoaXMuaXNEb2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHVzaW5nIHN0b3JlLmdvVG8gb3V0c2lkZSBzdG9yZS5kbyEnKTtcbiAgICB9XG4gICAgaWYgKGFkZFVwID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmN1cnJlbnRQYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZG86IGZ1bmN0aW9uIF9kbyhuYW1lLCBhY3Rpb24sIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdGhpcy5pc0RvaW5nID0gdHJ1ZTtcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG5hbWUodGhpcywgYWN0aW9uLCBhLCBiLCBjLCBkLCBlLCBmKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFjdGlvbih0aGlzLCBhLCBiLCBjLCBkLCBlLCBmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBhcmFtZXRlciBhY3Rpb24uJyk7XG4gICAgfVxuICAgIC8vIGNvbXBvc2UgcmVzdWx0XG4gICAgcmVzdWx0LnBhdGNoZXMgPSB0aGlzLnBhdGNoZXM7XG4gICAgcmVzdWx0LnJlbGF0aXZlUGF0Y2hlcyA9IHRoaXMucmVsYXRpdmVQYXRjaGVzO1xuICAgIHJlc3VsdC5iYWNrUGF0Y2hlcyA9IHRoaXMuYmFja1BhdGNoZXM7XG4gICAgLy8gcmVzZXQgJ2RvJyBhYm91dCBhdHRyaWJ1dGVzXG4gICAgdGhpcy5wYXRjaGVzID0gW107XG4gICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMgPSBbXTtcbiAgICB0aGlzLmJhY2tQYXRjaGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9IFtdO1xuICAgIHRoaXMuaXNEb2luZyA9IGZhbHNlO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIGFkZDogZnVuY3Rpb24gYWRkKHBhdGgsIHZhbHVlLCBrZXksIHBhcmVudFBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSBwYXJlbnRQYXRoICE9PSB1bmRlZmluZWQgPyBwYXJlbnRQYXRoIDogdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMCxcbiAgICAgICAgcmVmVHlwZSA9IHZvaWQgMDtcbiAgICBwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFwYXRoIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAocmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKSkgPT09ICdvYmplY3QnICYmICF1dGlscy5pc0NvbW1vbktleVR5cGUoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVBZGQocGF0aCwgdmFsdWUsIGtleSkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlQWRkKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgdmFsdWUsIGtleSkpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHBhdGguY29uY2F0KGtleSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpLCB0cnVlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmVmW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluZGV4ID0gYXJyYXkucGFyc2VBcnJheUluZGV4KGtleSk7XG4gICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZWYuc3BsaWNlKGluZGV4LCAwLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWYucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShwYXRoLCBwYXJlbnRQYXRoKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gcGFyZW50UGF0aCAhPT0gdW5kZWZpbmVkID8gcGFyZW50UGF0aCA6IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUocGF0aCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlUmVtb3ZlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCksIHRydWUpKTtcbiAgICB9XG4gICAgaWYgKHBhdGgubGVuZ3RoIDwgMSkge1xuICAgICAgdGhpcy5zdG9yZSA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgbGFzdEtleSA9IHBhdGgucG9wKCksXG4gICAgICAgIHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSxcbiAgICAgICAgcmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKTtcbiAgICBpZiAocmVmVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgcmVmLnNwbGljZShsYXN0S2V5LCAxKTtcbiAgICB9IGVsc2UgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBkZWxldGUgcmVmW2xhc3RLZXldO1xuICAgIH1cbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUocGF0aCwgdmFsdWUsIGZvcmNlVXBkYXRlLCBwYXJlbnRQYXRoKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gcGFyZW50UGF0aCAhPT0gdW5kZWZpbmVkID8gcGFyZW50UGF0aCA6IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgbGFzdEtleSA9IHZvaWQgMCxcbiAgICAgICAgZnVsbFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICBpZiAoZnVsbFBhdGgpIHtcbiAgICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShmdWxsUGF0aCwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHRoaXMuX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aCksIHZhbHVlKSk7XG4gICAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB0aGlzLmdldChmdWxsUGF0aCkpKTtcbiAgICAgIH1cbiAgICAgIGxhc3RLZXkgPSBmdWxsUGF0aC5wb3AoKTtcbiAgICAgIGlmIChsYXN0S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fZ2V0UmVmKGZ1bGxQYXRoKVtsYXN0S2V5XSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdG9yZSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2UgaWYgKGZvcmNlVXBkYXRlID09PSB0cnVlICYmIHBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgbGFzdEtleSA9IHBhdGgucG9wKCk7XG4gICAgICByZXR1cm4gdGhpcy5hZGQocGF0aCwgdmFsdWUsIGxhc3RLZXksIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uIHNldChwYXRoLCB2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXRoLCB2YWx1ZSwgdHJ1ZSwgdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSkpO1xuICB9LFxuICBtb3ZlVXA6IGZ1bmN0aW9uIG1vdmVVcChwYXRoKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgcmV0dXJuIHRoaXMuX21vdmVBcnJheUl0ZW0ocGF0aCwgdHJ1ZSk7XG4gIH0sXG4gIG1vdmVEb3duOiBmdW5jdGlvbiBtb3ZlRG93bihwYXRoKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgcmV0dXJuIHRoaXMuX21vdmVBcnJheUl0ZW0ocGF0aCk7XG4gIH0sXG4gIG1vdmVUbzogZnVuY3Rpb24gbW92ZVRvKGZyb20sIHRvLCBrZXkpIHtcbiAgICB2YXIgcGFyZW50RnJvbVBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKGZyb20sIGZhbHNlKSxcbiAgICAgICAgcGFyZW50VG9QYXRoID0gdGhpcy5fZm9ybWF0UGF0aCh0bywgZmFsc2UpO1xuICAgIGZyb20gPSB0aGlzLl9nZXRGdWxsUGF0aChmcm9tKTtcbiAgICB0byA9IHRoaXMuX2dldEZ1bGxQYXRoKHRvKTtcbiAgICBpZiAoIWZyb20gfHwgIXRvIHx8ICF1dGlscy5pc1JlZmVyZW5jZVR5cGUodGhpcy5fZ2V0UmVmKHRvKSkpIHJldHVybiB0aGlzO1xuICAgIHRoaXMuYWRkKHRvLCB0aGlzLl9nZXRSZWYoZnJvbSksIGtleSwgcGFyZW50VG9QYXRoKTtcbiAgICB0aGlzLnJlbW92ZShmcm9tLCBwYXJlbnRGcm9tUGF0aCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGV4Y2hhbmdlOiBmdW5jdGlvbiBleGNoYW5nZShmcm9tLCB0bykge1xuICAgIHZhciBwYXJlbnRGcm9tUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgoZnJvbSwgZmFsc2UpLFxuICAgICAgICBwYXJlbnRUb1BhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRvLCBmYWxzZSk7XG4gICAgZnJvbSA9IHRoaXMuX2dldEZ1bGxQYXRoKGZyb20pO1xuICAgIHRvID0gdGhpcy5fZ2V0RnVsbFBhdGgodG8pO1xuICAgIGlmIChmcm9tICYmIHRvKSB7XG4gICAgICB2YXIgZnJvbVJlZiA9IHRoaXMuX2dldFJlZihmcm9tKSxcbiAgICAgICAgICB0b1JlZiA9IHRoaXMuZ2V0KHRvKTtcbiAgICAgIHRoaXMudXBkYXRlKGZyb20sIHRvUmVmLCBmYWxzZSwgcGFyZW50RnJvbVBhdGgpO1xuICAgICAgdGhpcy51cGRhdGUodG8sIGZyb21SZWYsIGZhbHNlLCBwYXJlbnRUb1BhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZXh0ZW5kT2JqZWN0OiBmdW5jdGlvbiBleHRlbmRPYmplY3QocGF0aCwgYSwgYiwgYywgZCwgZSwgZikge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciByZWYgPSB2b2lkIDA7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCB1dGlscy50eXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgIT09ICdvYmplY3QnKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlRXh0ZW5kT2JqZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlRXh0ZW5kT2JqZWN0KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYSwgYiwgYywgZCwgZSwgZikpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgb2JqZWN0LmV4dGVuZChyZWYsIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzcHJlYWRBcnJheTogZnVuY3Rpb24gc3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciByZWYgPSB2b2lkIDA7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCB1dGlscy50eXBlKHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgIT09ICdhcnJheScpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHR5cGVvZiBiZWdpbiA9PT0gJ251bWJlcicgPyBiZWdpbiA6IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZEFycmF5KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkQXJyYXkocmVmLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KTtcbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gc3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciByZWYgPSB2b2lkIDA7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSB0eXBlb2YgYmVnaW4gPT09ICdudW1iZXInID8gYmVnaW4gOiByZWYubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Um93KHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlSb3cocmVmLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCk7XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgcmVmID0gdm9pZCAwO1xuICAgIGlmICghKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkgfHwgIWFycmF5LmlzMmRBcnJheShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8ICEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gdHlwZW9mIGJlZ2luID09PSAnbnVtYmVyJyA/IGJlZ2luIDogcmVmWzBdLmxlbmd0aDtcbiAgICBpZiAoISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkMmRBcnJheUNvbCh0aGlzLl9nZXRSZWxhdGl2ZVBhdGgocGF0aCksIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBhcnJheS5zcHJlYWQyZEFycmF5Q29sKHJlZiwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpO1xuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uIGdldChwYXRoKSB7XG4gICAgaWYgKHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29weVN0b3JlID8gdXRpbHMuY29weSh0aGlzLl9nZXRSZWYocGF0aCkpIDogdGhpcy5fZ2V0UmVmKHBhdGgpO1xuICAgIH1cbiAgfSxcbiAgcGF0Y2g6IGZ1bmN0aW9uIHBhdGNoKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgZGVwcmVjYXRlZCwgdXNlIEpTT05TdG9yZS5wYXRjaCBpbnN0ZWFkLicpO1xuICB9LFxuICBhcHBseVBhdGNoOiBmdW5jdGlvbiBhcHBseVBhdGNoKHBhdGNoZXMpIHtcbiAgICBwYXRjaGVzID0gdXRpbHMudHlwZShwYXRjaGVzKSA9PT0gJ2FycmF5JyA/IHBhdGNoZXMgOiBbcGF0Y2hlc107XG4gICAgcGF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXRjaCkge1xuICAgICAgdGhpc1twYXRjaC50eXBlXS5hcHBseSh0aGlzLCBwYXRjaC5hcmdzKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG5KU09ORGF0YVN0b3JlLlBhdGNoID0gcGF0Y2hNZXRob2RzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEpTT05EYXRhU3RvcmU7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQYXRoTGlzdGVuZXIob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5kZWVwRXF1YWwgPSBvcHRpb25zLmRlZXBFcXVhbCA9PT0gdHJ1ZTtcbiAgdGhpcy5jb3B5U3RvcmUgPSBvcHRpb25zLmNvcHlTdG9yZTtcbiAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgdGhpcy5ncm91cFJlZnMgPSB7fTtcbiAgdGhpcy5zdG9yZSA9IG9wdGlvbnMuc3RvcmUgfHwge307XG4gIHRoaXMuZmxhc2hLZXlzID0gb3B0aW9ucy5mbGFzaEtleXMgfHwge307XG59XG5cblBhdGhMaXN0ZW5lci5wcm90b3R5cGUgPSB7XG4gIF9jb3B5RGF0YTogZnVuY3Rpb24gX2NvcHlEYXRhKGRhdGEpIHtcbiAgICBpZiAoZGF0YSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZGF0YTtcbiAgICByZXR1cm4gdGhpcy5jb3B5U3RvcmUgPyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKSA6IGRhdGE7XG4gIH0sXG4gIF9yZW1vdmVMaXN0ZW5lcjogZnVuY3Rpb24gX3JlbW92ZUxpc3RlbmVyKGxpc3RlbmVycywgY2IpIHtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGNiKSB7XG4gICAgICAgIGxpc3RlbmVyc1tpXSA9IG51bGw7XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9LFxuICByZWdpc3Rlckxpc3RlbmVyOiBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVyKHBhdGgsIGNiLCBncm91cCwgY2hlY2spIHtcbiAgICBncm91cCA9IHR5cGVvZiBncm91cCA9PT0gJ3N0cmluZycgPyBncm91cCA6IG51bGw7XG4gICAgY2hlY2sgPSBncm91cCA9PT0gbnVsbCA/IGdyb3VwICE9PSBmYWxzZSA6IGNoZWNrICE9PSBmYWxzZTtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBwYXRoSXRlbSA9IHZvaWQgMCxcbiAgICAgICAgdHJlZVJlZiA9IHRoaXMubGlzdGVuZXJUcmVlLFxuICAgICAgICBsaXN0ZW5lckluZGV4ID0gdm9pZCAwO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBwYXRoSXRlbSA9IHBhdGhbaSsrXTtcbiAgICAgIGlmICh0cmVlUmVmW3BhdGhJdGVtXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRyZWVSZWZbcGF0aEl0ZW1dID0geyBjaGlsZHJlbjoge30sIGxpc3RlbmVyczogW10gfTtcbiAgICAgIH1cbiAgICAgIHRyZWVSZWYgPSBpID09PSBsZW4gPyB0cmVlUmVmW3BhdGhJdGVtXSA6IHRyZWVSZWZbcGF0aEl0ZW1dLmNoaWxkcmVuO1xuICAgIH1cbiAgICBsaXN0ZW5lckluZGV4ID0gdHJlZVJlZi5saXN0ZW5lcnMucHVzaChjYikgLSAxO1xuICAgIGlmIChncm91cCAhPT0gbnVsbCkge1xuICAgICAgaWYgKHRoaXMuZ3JvdXBSZWZzW2dyb3VwXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBSZWZzW2dyb3VwXSA9IFtdO1xuICAgICAgfVxuICAgICAgdGhpcy5ncm91cFJlZnNbZ3JvdXBdLnB1c2goW3RyZWVSZWYubGlzdGVuZXJzLCBsaXN0ZW5lckluZGV4XSk7XG4gICAgfVxuICAgIGlmIChjaGVjaykge1xuICAgICAgdGhpcy5jaGVja1BhdGgocGF0aCk7XG4gICAgfVxuICB9LFxuICBjaGVja1BhdGg6IGZ1bmN0aW9uIGNoZWNrUGF0aChwYXRoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHBhdGhJdGVtID0gdm9pZCAwLFxuICAgICAgICB0cmVlUmVmID0gdGhpcy5saXN0ZW5lclRyZWUsXG4gICAgICAgIGRhdGFSZWYgPSB0aGlzLnN0b3JlO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBpZiAoZGF0YVJlZiA9PT0gdW5kZWZpbmVkKSBicmVhaztcbiAgICAgIHBhdGhJdGVtID0gcGF0aFtpKytdO1xuICAgICAgZGF0YVJlZiA9IGRhdGFSZWZbcGF0aEl0ZW1dO1xuICAgICAgaWYgKHRyZWVSZWZbcGF0aEl0ZW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJlZVJlZltwYXRoSXRlbV0ubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgdHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nICYmIGxpc3RlbmVyKF90aGlzLl9jb3B5RGF0YShkYXRhUmVmKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0cmVlUmVmID0gdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmZsYXNoS2V5c1twYXRoWzBdXSkge1xuICAgICAgdGhpcy5zdG9yZVtwYXRoWzBdXSA9IG51bGw7XG4gICAgfVxuICB9LFxuICByZW1vdmVBbGxMaXN0ZW5lcnM6IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycygpIHtcbiAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgIHRoaXMuZ3JvdXBSZWZzID0ge307XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlQYXRoOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYikge1xuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aCxcbiAgICAgICAgcGF0aEl0ZW0gPSB2b2lkIDAsXG4gICAgICAgIHRyZWVSZWYgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgcGF0aEl0ZW0gPSBwYXRoW2krK107XG4gICAgICBpZiAodHJlZVJlZltwYXRoSXRlbV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgdHJlZVJlZiA9IGkgPT09IGxlbiA/IHRyZWVSZWZbcGF0aEl0ZW1dIDogdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVyKHRyZWVSZWYubGlzdGVuZXJzLCBjYik7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlHcm91cDogZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKSB7XG4gICAgdmFyIGdyb3VwTGlzdGVuZXJzID0gdGhpcy5ncm91cFJlZnNbZ3JvdXBdO1xuICAgIGlmIChncm91cExpc3RlbmVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBncm91cExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyKSB7XG4gICAgICAgIHR5cGVvZiBwYWlyWzBdW3BhaXJbMV1dID09PSAnZnVuY3Rpb24nICYmIChwYWlyWzBdW3BhaXJbMV1dID0gbnVsbCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGF0aExpc3RlbmVyOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgc3BsaWNlID0gQXJyYXkucHJvdG90eXBlLnNwbGljZTtcblxudmFyIGNyZWF0ZUFycmF5ID0gZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoLCBpbmZpbGxpbmcpIHtcbiAgbGVuZ3RoID0gbGVuZ3RoIHx8IDA7XG4gIHZhciBhcnIgPSBbXSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgYXJyLnB1c2goaW5maWxsaW5nID09PSB1bmRlZmluZWQgPyBudWxsIDogdXRpbHMuY29weShpbmZpbGxpbmcpKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudmFyIGlzMmRBcnJheSA9IGZ1bmN0aW9uIGlzMmRBcnJheShhcnIpIHtcbiAgdmFyIGlzMmQ7XG4gIGlmIChpczJkID0gdXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknICYmIGFyci5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBhcnIubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlzMmQgJj0gdXRpbHMudHlwZShhcnJbaV0pID09PSAnYXJyYXknO1xuICAgICAgaWYgKCFpczJkKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjcmVhdGUyZEFycmF5ID0gZnVuY3Rpb24gY3JlYXRlMmRBcnJheShyb3csIGNvbCwgaW5maWxsaW5nKSB7XG4gIHJvdyA9IHJvdyB8fCAwO1xuICBjb2wgPSBjb2wgfHwgMDtcbiAgdmFyIGFyciA9IG5ldyBBcnJheShyb3cpLFxuICAgICAgaSA9IDA7XG4gIGZvciAoOyBpIDwgcm93OyBpKyspIHtcbiAgICBhcnJbaV0gPSBjcmVhdGVBcnJheShjb2wsIGluZmlsbGluZyk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBwYXJzZUFycmF5SW5kZXggPSBmdW5jdGlvbiBwYXJzZUFycmF5SW5kZXgoaW5kZXgpIHtcbiAgdmFyIHR5cGUgPSB1dGlscy50eXBlKGluZGV4KTtcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnIHx8IHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHBhcnNlSW50KGluZGV4KTtcbiAgfVxuICByZXR1cm4gdm9pZCAwO1xufTtcblxudmFyIGdldEFycmF5SW5kZXhCeVZhbHVlID0gZnVuY3Rpb24gZ2V0QXJyYXlJbmRleEJ5VmFsdWUoYXJyLCB2YWx1ZSkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIHZhbHVlVHlwZSA9IHV0aWxzLnR5cGUodmFsdWUpO1xuICAgIGlmICh2YWx1ZVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgbGVuID0gYXJyLmxlbmd0aCxcbiAgICAgICAgICBpdGVtO1xuICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpdGVtID0gYXJyW2ldO1xuICAgICAgICB2YXIgaXNFcXVhbCA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaXNFcXVhbCA9IGl0ZW1ba2V5XSA9PT0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIGlmICghaXNFcXVhbCkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0VxdWFsKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFyci5pbmRleE9mKHZhbHVlKTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtVXAgPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtVXAoYXJyLCBpbmRleCkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgaW5kZXggPSBwYXJzZUFycmF5SW5kZXgoaW5kZXgpO1xuICAgIHZhciBjdXJySXRlbSA9IGFycltpbmRleF07XG4gICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCAtIDFdO1xuICAgICAgYXJyW2luZGV4IC0gMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtRG93biA9IGZ1bmN0aW9uIG1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA8IGFyci5sZW5ndGggLSAxKSB7XG4gICAgICBhcnJbaW5kZXhdID0gYXJyW2luZGV4ICsgMV07XG4gICAgICBhcnJbaW5kZXggKyAxXSA9IGN1cnJJdGVtO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHNwcmVhZEFycmF5ID0gZnVuY3Rpb24gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gIHZhciBkZWxldGVkID0gW107XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICB2YXIgaW5maWxsaW5nVHlwZSA9IHV0aWxzLnR5cGUoaW5maWxsaW5nKTtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChjcmVhdGVBcnJheShwYXJzZUludChjb3VudCkgfHwgMSwgaW5maWxsaW5nKSkpO1xuICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoaW5maWxsaW5nKSk7XG4gICAgfSBlbHNlIGlmIChpbmZpbGxpbmdUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKGluZmlsbGluZyA+IDApIHtcbiAgICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoY3JlYXRlQXJyYXkoaW5maWxsaW5nKSkpO1xuICAgICAgfSBlbHNlIGlmIChpbmZpbGxpbmcgPCAwKSB7XG4gICAgICAgIGRlbGV0ZWQgPSBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIE1hdGguYWJzKGluZmlsbGluZyldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG52YXIgc3ByZWFkMmRBcnJheVJvdyA9IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3coYXJyLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICB2YXIgZGVsZXRlZCA9IFtdLFxuICAgICAgcm93c1R5cGUgPSB1dGlscy50eXBlKHJvd3MpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgY29sQ291bnQgPSBhcnJbMF0ubGVuZ3RoO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGNyZWF0ZUFycmF5KGNvbENvdW50LCByb3dzKSwgdHJ1ZSwgY291bnQpO1xuICAgIH0gZWxzZSBpZiAocm93c1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAocm93cyA+IDApIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgY3JlYXRlMmRBcnJheShyb3dzLCBjb2xDb3VudCkpO1xuICAgICAgfSBlbHNlIGlmIChyb3dzIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyb3dzVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlDb2wgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Q29sKGFyciwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIGRlbGV0ZWRDb2wsXG4gICAgICBjb2xzVHlwZSA9IHV0aWxzLnR5cGUoY29scyk7XG4gIGlmIChpczJkQXJyYXkoYXJyKSkge1xuICAgIHZhciByb3dDb3VudCA9IGFyci5sZW5ndGgsXG4gICAgICAgIGkgPSAwO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzLCB0cnVlLCBjb3VudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xzVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBkZWxldGVkQ29sID0gc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29scyk7XG4gICAgICAgIGlmIChkZWxldGVkQ29sLmxlbmd0aCkge1xuICAgICAgICAgIGRlbGV0ZWQucHVzaChkZWxldGVkQ29sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sc1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXMyZEFycmF5OiBpczJkQXJyYXksXG4gIGNyZWF0ZUFycmF5OiBjcmVhdGVBcnJheSxcbiAgY3JlYXRlMmRBcnJheTogY3JlYXRlMmRBcnJheSxcbiAgcGFyc2VBcnJheUluZGV4OiBwYXJzZUFycmF5SW5kZXgsXG4gIGdldEFycmF5SW5kZXhCeVZhbHVlOiBnZXRBcnJheUluZGV4QnlWYWx1ZSxcbiAgbW92ZUFycmF5SXRlbVVwOiBtb3ZlQXJyYXlJdGVtVXAsXG4gIG1vdmVBcnJheUl0ZW1Eb3duOiBtb3ZlQXJyYXlJdGVtRG93bixcbiAgc3ByZWFkQXJyYXk6IHNwcmVhZEFycmF5LFxuICBzcHJlYWQyZEFycmF5Um93OiBzcHJlYWQyZEFycmF5Um93LFxuICBzcHJlYWQyZEFycmF5Q29sOiBzcHJlYWQyZEFycmF5Q29sXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZ2V0T2JqZWN0S2V5QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldE9iamVjdEtleUJ5VmFsdWUob2JqLCB2YWx1ZSkge1xuICB2YXIgb2JqS2V5LCBvYmpWYWx1ZSwgdmFsdWVLZXk7XG4gIGlmICh1dGlscy50eXBlKHZhbHVlKSA9PT0gJ29iamVjdCcpIHtcbiAgICBvdXRlcjogZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgdXRpbHMudHlwZShvYmpWYWx1ZSA9IG9ialtvYmpLZXldKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YWx1ZUtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eSh2YWx1ZUtleSkgJiYgdmFsdWVbdmFsdWVLZXldICE9PSBvYmpWYWx1ZVt2YWx1ZUtleV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqS2V5O1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKG9iaktleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkob2JqS2V5KSAmJiBvYmpbb2JqS2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG4gIHZhciB0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG4gICAgICBhcmdMZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ0xlbjsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSxcbiAgICAgICAga2V5O1xuICAgIGlmICh1dGlscy50eXBlKHNvdXJjZSkgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB1dGlscy5jb3B5KHNvdXJjZVtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGhhc093blByb3BlcnR5OiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgZ2V0T2JqZWN0S2V5QnlWYWx1ZTogZ2V0T2JqZWN0S2V5QnlWYWx1ZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHBhdGNoVHlwZXMgPSB7XG4gIGFkZDogJ2FkZCcsXG4gIHJlbW92ZTogJ3JlbW92ZScsXG4gIHVwZGF0ZTogJ3VwZGF0ZScsXG4gIHNldDogJ3NldCcsXG4gIG1vdmVVcDogJ21vdmVVcCcsXG4gIG1vdmVEb3duOiAnbW92ZURvd24nLFxuICBtb3ZlVG86ICdtb3ZlVG8nLFxuICBleGNoYW5nZTogJ2V4Y2hhbmdlJyxcbiAgZXh0ZW5kT2JqZWN0OiAnZXh0ZW5kT2JqZWN0JyxcbiAgc3ByZWFkQXJyYXk6ICdzcHJlYWRBcnJheScsXG4gIHNwcmVhZDJkQXJyYXlDb2w6ICdzcHJlYWQyZEFycmF5Q29sJyxcbiAgc3ByZWFkMmRBcnJheVJvdzogJ3NwcmVhZDJkQXJyYXlSb3cnXG59O1xuXG52YXIgY3JlYXRlUGF0Y2ggPSBmdW5jdGlvbiBjcmVhdGVQYXRjaCh0eXBlLCBhcmdzKSB7XG4gIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKTtcbiAgcmV0dXJuIHV0aWxzLmNvcHkoe1xuICAgIHR5cGU6IHR5cGUsXG4gICAgYXJnczogYXJnc1xuICB9KTtcbn07XG5cbi8qKlxuICogY3JlYXRlIHBhdGNoIG9wZXJhdGlvbnNcbiAqICovXG5cbnZhciBwYXRjaE1ldGhvZHMgPSB7XG4gIGNyZWF0ZUFkZDogZnVuY3Rpb24gY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5hZGQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVJlbW92ZTogZnVuY3Rpb24gY3JlYXRlUmVtb3ZlKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5yZW1vdmUsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVVwZGF0ZTogZnVuY3Rpb24gY3JlYXRlVXBkYXRlKHBhdGgsIHZhbHVlLCBmb3JjZVVwZGF0ZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnVwZGF0ZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU2V0OiBmdW5jdGlvbiBjcmVhdGVTZXQocGF0aCwgdmFsdWUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zZXQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVVcDogZnVuY3Rpb24gY3JlYXRlTW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVXAsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVEb3duOiBmdW5jdGlvbiBjcmVhdGVNb3ZlRG93bihwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZURvd24sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVUbzogZnVuY3Rpb24gY3JlYXRlTW92ZVRvKGZyb20sIHRvLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVG8sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZUV4Y2hhbmdlOiBmdW5jdGlvbiBjcmVhdGVFeGNoYW5nZShmcm9tLCB0bykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4Y2hhbmdlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGNyZWF0ZUV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuZXh0ZW5kT2JqZWN0LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWRBcnJheTogZnVuY3Rpb24gY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZEFycmF5LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBjcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc3ByZWFkMmRBcnJheVJvdywgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlDb2wsIGFyZ3VtZW50cyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hNZXRob2RzOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlZmVyZW5jZVR5cGVzID0ge1xuICAnYXJyYXknOiB0cnVlLFxuICAnb2JqZWN0JzogdHJ1ZVxufTtcblxudmFyIGNvbW1vbktleVR5cGVzID0ge1xuICAnc3RyaW5nJzogdHJ1ZSxcbiAgJ251bWJlcic6IHRydWVcbn07XG5cbnZhciB0eXBlID0gZnVuY3Rpb24gdHlwZShkYXRhKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0YSkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG52YXIgaXNSZWZlcmVuY2VUeXBlID0gZnVuY3Rpb24gaXNSZWZlcmVuY2VUeXBlKGRhdGEpIHtcbiAgcmV0dXJuIHJlZmVyZW5jZVR5cGVzW3R5cGUoZGF0YSldIHx8IGZhbHNlO1xufTtcblxudmFyIGlzQ29tbW9uS2V5VHlwZSA9IGZ1bmN0aW9uIGlzQ29tbW9uS2V5VHlwZShrZXkpIHtcbiAgcmV0dXJuIGNvbW1vbktleVR5cGVzW3R5cGUoa2V5KV0gfHwgZmFsc2U7XG59O1xuXG52YXIgY29weSA9IGZ1bmN0aW9uIGNvcHkoZGF0YSkge1xuICByZXR1cm4gaXNSZWZlcmVuY2VUeXBlKGRhdGEpID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSkgOiBkYXRhO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHR5cGU6IHR5cGUsXG4gIGNvcHk6IGNvcHksXG4gIGlzUmVmZXJlbmNlVHlwZTogaXNSZWZlcmVuY2VUeXBlLFxuICBpc0NvbW1vbktleVR5cGU6IGlzQ29tbW9uS2V5VHlwZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvSlNPTkRhdGFTdG9yZScpOyJdfQ==
