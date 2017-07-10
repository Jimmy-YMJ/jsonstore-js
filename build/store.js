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
  registerPathListener: function registerPathListener(path, callback, group) {
    path = Array.isArray(path) ? path : [path];
    this.pathListener.registerListener(path, callback, group);
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
        listeners.splice(i, 1);
        break;
      }
      i++;
    }
  },
  registerListener: function registerListener(path, cb, group) {
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
    if (typeof group === 'string') {
      if (this.groupRefs[group] === undefined) {
        this.groupRefs[group] = [];
      }
      this.groupRefs[group].push([treeRef.listeners, listenerIndex]);
    }
    if (group === true) {
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
          listener(_this._copyData(dataRef));
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
        pair[0].splice(pair[1], 1);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9KU09ORGF0YVN0b3JlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvUGF0aExpc3RlbmVyLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9wYXRjaC5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogb3B0aW9uczpcbiAqICBzdG9yZVxuICogIGNvcHlTdG9yZVxuICogIGNhY2hlS2V5c1xuICogIGxvY2FsU3RvcmFnZVxuICogKiovXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcbnZhciBvYmplY3QgPSByZXF1aXJlKCcuL29iamVjdCcpO1xudmFyIHBhdGNoTWV0aG9kcyA9IHJlcXVpcmUoJy4vcGF0Y2gnKTtcbnZhciBQYXRoTGlzdGVuZXIgPSByZXF1aXJlKCcuL1BhdGhMaXN0ZW5lcicpO1xudmFyIEpTT05fU1RPUkVfQ0FDSEVfS0VZX1BSRUZJWCA9ICdKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVgnO1xudmFyIGVtcHR5RnVuYyA9IGZ1bmN0aW9uIGVtcHR5RnVuYygpIHt9O1xuXG5mdW5jdGlvbiBKU09ORGF0YVN0b3JlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMuaW5pdGlhbE9wdGlvbnMgPSB1dGlscy5jb3B5KG9wdGlvbnMpO1xuICB2YXIgc3RvcmUgPSBvcHRpb25zLnN0b3JlLFxuICAgICAgY29weVN0b3JlID0gb3B0aW9ucy5jb3B5U3RvcmUgIT09IGZhbHNlO1xuICB0aGlzLmNvcHlTdG9yZSA9IGNvcHlTdG9yZTtcbiAgdGhpcy5zdG9yZSA9IGNvcHlTdG9yZSA/IHV0aWxzLmNvcHkoc3RvcmUpIDogc3RvcmU7XG4gIHRoaXMuY2FjaGVLZXlzID0gdGhpcy5fZ2V0U3RvcmVLZXlzTWFwKG9wdGlvbnMuY2FjaGVLZXlzLCB0aGlzLnN0b3JlKTtcbiAgdGhpcy5mbGFzaEtleXMgPSB0aGlzLl9nZXRTdG9yZUtleXNNYXAob3B0aW9ucy5mbGFzaEtleXMsIHRoaXMuc3RvcmUpO1xuICB0aGlzLmNhY2hlS2V5UHJlZml4ID0gb3B0aW9ucy5jYWNoZUtleVByZWZpeCB8fCBKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVg7XG4gIHRoaXMubG9jYWxTdG9yYWdlID0gb3B0aW9ucy5sb2NhbFN0b3JhZ2U7XG4gIC8vICdkbycgYWJvdXQgYXR0cmlidXRlc1xuICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMgPSBbXTtcbiAgdGhpcy5iYWNrUGF0Y2hlcyA9IFtdO1xuICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gIHRoaXMuaXNEb2luZyA9IGZhbHNlO1xuICB0aGlzLnBhdGhMaXN0ZW5lciA9IG5ldyBQYXRoTGlzdGVuZXIoeyBzdG9yZTogdGhpcy5zdG9yZSwgY29weVN0b3JlOiBjb3B5U3RvcmUsIGZsYXNoS2V5czogdGhpcy5mbGFzaEtleXMgfSk7XG4gIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IFtdO1xufVxuXG5KU09ORGF0YVN0b3JlLnByb3RvdHlwZSA9IHtcbiAgX3N0b3JlVXBkYXRlZDogZnVuY3Rpb24gX3N0b3JlVXBkYXRlZCgpIHtcbiAgICB0aGlzLl91cGRhdGVDYWNoZSh0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGhbMF0pO1xuICAgIHRoaXMucGF0aExpc3RlbmVyLmNoZWNrUGF0aCh0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGgpO1xuICB9LFxuICBfZ2V0U3RvcmVLZXlzTWFwOiBmdW5jdGlvbiBfZ2V0U3RvcmVLZXlzTWFwKGtleXMsIHN0b3JlKSB7XG4gICAgdmFyIGtleXNNYXAgPSB7fTtcbiAgICBpZiAodXRpbHMudHlwZShrZXlzKSA9PT0gJ2FycmF5Jykge1xuICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0b3JlLCBrZXkpKSB7XG4gICAgICAgICAga2V5c01hcFtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBrZXlzTWFwO1xuICB9LFxuICBfZ2V0UmVmOiBmdW5jdGlvbiBfZ2V0UmVmKHBhdGgpIHtcbiAgICB2YXIgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHJlZiA9IHJlZltwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZjtcbiAgfSxcbiAgX2RldGVjdFBhdGg6IGZ1bmN0aW9uIF9kZXRlY3RQYXRoKHBhdGgpIHtcbiAgICB2YXIgZGV0ZWN0ZWQgPSBbXSxcbiAgICAgICAgcmVmID0gdGhpcy5zdG9yZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBrZXkgPSB2b2lkIDAsXG4gICAgICAgIGtleVR5cGUgPSB2b2lkIDAsXG4gICAgICAgIHJlZlR5cGUgPSB2b2lkIDA7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcGF0aFtpXTtcbiAgICAgIGtleVR5cGUgPSB1dGlscy50eXBlKGtleSk7XG4gICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgb2JqS2V5ID0gb2JqZWN0LmdldE9iamVjdEtleUJ5VmFsdWUocmVmLCBrZXkuX192YWx1ZSk7XG4gICAgICAgICAgaWYgKG9iaktleSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW29iaktleV07XG4gICAgICAgICAgICBkZXRlY3RlZC5wdXNoKG9iaktleSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVmLCBrZXkpKSB7XG4gICAgICAgICAgcmVmID0gcmVmW2tleV07XG4gICAgICAgICAgZGV0ZWN0ZWQucHVzaChrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChrZXksICdfX3ZhbHVlJykpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5nZXRBcnJheUluZGV4QnlWYWx1ZShyZWYsIGtleS5fX3ZhbHVlKTtcbiAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgcmVmID0gcmVmW2luZGV4XTtcbiAgICAgICAgICAgIGRldGVjdGVkLnB1c2goaW5kZXgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlZiwga2V5KSkge1xuICAgICAgICAgIHJlZiA9IHJlZltrZXldO1xuICAgICAgICAgIGRldGVjdGVkLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRldGVjdGVkO1xuICB9LFxuICBfZm9ybWF0UGF0aDogZnVuY3Rpb24gX2Zvcm1hdFBhdGgocGF0aCwgZGV0ZWN0KSB7XG4gICAgdmFyIHBhdGhUeXBlID0gdXRpbHMudHlwZShwYXRoKTtcbiAgICBpZiAocGF0aFR5cGUgPT09ICd1bmRlZmluZWQnIHx8IHBhdGhUeXBlID09PSAnbnVsbCcpIHtcbiAgICAgIHBhdGggPSBbXTtcbiAgICB9IGVsc2UgaWYgKHBhdGhUeXBlICE9PSAnYXJyYXknKSB7XG4gICAgICBwYXRoID0gW3BhdGhdO1xuICAgIH1cbiAgICBpZiAoZGV0ZWN0ICE9PSBmYWxzZSkge1xuICAgICAgdmFyIGRldGVjdGVkID0gdGhpcy5fZGV0ZWN0UGF0aChwYXRoKTtcbiAgICAgIGlmIChkZXRlY3RlZC5sZW5ndGggPT09IHBhdGgubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBkZXRlY3RlZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5zbGljZSgpO1xuICB9LFxuICBfbW92ZUFycmF5SXRlbTogZnVuY3Rpb24gX21vdmVBcnJheUl0ZW0ocGF0aCwgbW92ZVVwKSB7XG4gICAgdmFyIGZ1bGxQYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCk7XG4gICAgaWYgKCFmdWxsUGF0aCB8fCBmdWxsUGF0aC5sZW5ndGggPCAxKSByZXR1cm4gdGhpcztcbiAgICB2YXIgaXRlbUluZGV4ID0gZnVsbFBhdGgucG9wKCksXG4gICAgICAgIGFyciA9IHRoaXMuX2dldFJlZihmdWxsUGF0aCk7XG4gICAgaWYgKHV0aWxzLnR5cGUoYXJyKSAhPT0gJ2FycmF5JykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIG1ldGhvZCA9IG1vdmVVcCA9PT0gdHJ1ZSA/ICdjcmVhdGVNb3ZlVXAnIDogJ2NyZWF0ZU1vdmVEb3duJyxcbiAgICAgICAgcmV2ZXJzZU1ldGhvZCA9IG1ldGhvZCA9PT0gJ2NyZWF0ZU1vdmVVcCcgPyAnY3JlYXRlTW92ZURvd24nIDogJ2NyZWF0ZU1vdmVVcCc7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0oZnVsbFBhdGguY29uY2F0KGl0ZW1JbmRleCkpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzW21ldGhvZF0odGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSkpO1xuICAgICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSAmJiBpdGVtSW5kZXggPiAwIHx8IG1vdmVVcCAhPT0gdHJ1ZSAmJiBpdGVtSW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzW3JldmVyc2VNZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChtb3ZlVXAgPT09IHRydWUgPyBpdGVtSW5kZXggLSAxIDogaXRlbUluZGV4ICsgMSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1vdmVVcCA9PT0gdHJ1ZSkge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbVVwKGFyciwgaXRlbUluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXJyYXkubW92ZUFycmF5SXRlbURvd24oYXJyLCBpdGVtSW5kZXgpO1xuICAgIH1cbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgX2dldEZ1bGxQYXRoOiBmdW5jdGlvbiBfZ2V0RnVsbFBhdGgocGF0aCkge1xuICAgIGlmICh1dGlscy5pc1JlZmVyZW5jZVR5cGUocGF0aCkgJiYgcGF0aC5pc0Z1bGwpIHtcbiAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbiAgICB2YXIgY3VycmVudFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRoaXMuY3VycmVudFBhdGgsIGZhbHNlKSxcbiAgICAgICAgZnVsbFBhdGggPSBjdXJyZW50UGF0aC5jb25jYXQodGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSkpLFxuICAgICAgICBmb3JtYXR0ZWRGdWxsUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgoZnVsbFBhdGgpO1xuICAgIGlmIChmb3JtYXR0ZWRGdWxsUGF0aCkge1xuICAgICAgZm9ybWF0dGVkRnVsbFBhdGguaXNGdWxsID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdHRlZEZ1bGxQYXRoO1xuICB9LFxuICBfZ2V0UmVsYXRpdmVQYXRoOiBmdW5jdGlvbiBfZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSB7XG4gICAgcmV0dXJuIGZ1bGxQYXRoLnNsaWNlKHRoaXMuY3VycmVudFBhdGgubGVuZ3RoKTtcbiAgfSxcbiAgX2NvbXBvc2VDYWNoZUtleTogZnVuY3Rpb24gX2NvbXBvc2VDYWNoZUtleShrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZUtleVByZWZpeCArICdAJyArIGtleTtcbiAgfSxcbiAgX3VwZGF0ZUNhY2hlOiBmdW5jdGlvbiBfdXBkYXRlQ2FjaGUoa2V5KSB7XG4gICAgaWYgKHRoaXMuY2FjaGVLZXlzW2tleV0gJiYgdGhpcy5sb2NhbFN0b3JhZ2UgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5fY29tcG9zZUNhY2hlS2V5KGtleSksIHRoaXMuZ2V0KGtleSkpO1xuICAgIH1cbiAgfSxcbiAgcmVnaXN0ZXJQYXRoTGlzdGVuZXI6IGZ1bmN0aW9uIHJlZ2lzdGVyUGF0aExpc3RlbmVyKHBhdGgsIGNhbGxiYWNrLCBncm91cCkge1xuICAgIHBhdGggPSBBcnJheS5pc0FycmF5KHBhdGgpID8gcGF0aCA6IFtwYXRoXTtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5yZWdpc3Rlckxpc3RlbmVyKHBhdGgsIGNhbGxiYWNrLCBncm91cCk7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlQYXRoOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYWxsYmFjaykge1xuICAgIHBhdGggPSBBcnJheS5pc0FycmF5KHBhdGgpID8gcGF0aCA6IFtwYXRoXTtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5yZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYWxsYmFjayk7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlHcm91cDogZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKSB7XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIucmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKTtcbiAgfSxcbiAgcmVtb3ZlQWxsTGlzdGVuZXJzOiBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoKSB7XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gIH0sXG4gIGxvYWRDYWNoZTogZnVuY3Rpb24gbG9hZENhY2hlKHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGVycm9yID0gdHlwZW9mIGVycm9yID09PSAnZnVuY3Rpb24nID8gZXJyb3IgOiBlbXB0eUZ1bmM7XG4gICAgaWYgKHRoaXMubG9jYWxTdG9yYWdlICYmIHR5cGVvZiB0aGlzLmxvY2FsU3RvcmFnZS5tdWx0aUdldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIGNhY2hlS2V5cyA9IHRoaXMuaW5pdGlhbE9wdGlvbnMuY2FjaGVLZXlzIHx8IFtdO1xuICAgICAgdmFyIGNvbXBvc2VkS2V5cyA9IGNhY2hlS2V5cy5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gX3RoaXMuX2NvbXBvc2VDYWNoZUtleShrZXkpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmxvY2FsU3RvcmFnZS5tdWx0aUdldChjb21wb3NlZEtleXMsIGZ1bmN0aW9uIChjYWNoZSkge1xuICAgICAgICB2YXIgcGFyc2VkQ2FjaGUgPSB7fTtcbiAgICAgICAgY29tcG9zZWRLZXlzLmZvckVhY2goZnVuY3Rpb24gKGNvbXBvc2VkS2V5LCBpbmRleCkge1xuICAgICAgICAgIHZhciBrZXkgPSBjYWNoZUtleXNbaW5kZXhdO1xuICAgICAgICAgIHZhciBjYWNoZWRWYWx1ZSA9IGNhY2hlW2NvbXBvc2VkS2V5XTtcbiAgICAgICAgICBfdGhpcy5zZXQoa2V5LCBjYWNoZWRWYWx1ZSA9PT0gbnVsbCA/IF90aGlzLmdldChrZXkpIDogY2FjaGVkVmFsdWUpO1xuICAgICAgICAgIHBhcnNlZENhY2hlW2tleV0gPSBjYWNoZVtjb21wb3NlZEtleV07XG4gICAgICAgIH0pO1xuICAgICAgICBzdWNjZXNzKHBhcnNlZENhY2hlKTtcbiAgICAgIH0sIGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3IoJ2xvY2FsU3RvcmFnZSBpcyB1bmRlZmluZWQnKTtcbiAgICB9XG4gIH0sXG4gIHJlSW5pdDogZnVuY3Rpb24gcmVJbml0KG9wdGlvbnMpIHtcbiAgICBKU09ORGF0YVN0b3JlLmNhbGwodGhpcywgb3B0aW9ucyB8fCB0aGlzLmluaXRpYWxPcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZ29UbzogZnVuY3Rpb24gZ29UbyhwYXRoLCBhZGRVcCkge1xuICAgIGlmICghdGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgdXNpbmcgc3RvcmUuZ29UbyBvdXRzaWRlIHN0b3JlLmRvIScpO1xuICAgIH1cbiAgICBpZiAoYWRkVXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkbzogZnVuY3Rpb24gX2RvKG5hbWUsIGFjdGlvbiwgYSwgYiwgYywgZCwgZSwgZikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB0aGlzLmlzRG9pbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbmFtZSh0aGlzLCBhY3Rpb24sIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWN0aW9uKHRoaXMsIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcGFyYW1ldGVyIGFjdGlvbi4nKTtcbiAgICB9XG4gICAgLy8gY29tcG9zZSByZXN1bHRcbiAgICByZXN1bHQucGF0Y2hlcyA9IHRoaXMucGF0Y2hlcztcbiAgICByZXN1bHQucmVsYXRpdmVQYXRjaGVzID0gdGhpcy5yZWxhdGl2ZVBhdGNoZXM7XG4gICAgcmVzdWx0LmJhY2tQYXRjaGVzID0gdGhpcy5iYWNrUGF0Y2hlcztcbiAgICAvLyByZXNldCAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gICAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgYWRkOiBmdW5jdGlvbiBhZGQocGF0aCwgdmFsdWUsIGtleSwgcGFyZW50UGF0aCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHBhcmVudFBhdGggIT09IHVuZGVmaW5lZCA/IHBhcmVudFBhdGggOiB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgcmVmID0gdm9pZCAwLFxuICAgICAgICByZWZUeXBlID0gdm9pZCAwO1xuICAgIHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICBpZiAoIXBhdGggfHwgIXV0aWxzLmlzUmVmZXJlbmNlVHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8IChyZWZUeXBlID0gdXRpbHMudHlwZShyZWYpKSA9PT0gJ29iamVjdCcgJiYgIXV0aWxzLmlzQ29tbW9uS2V5VHlwZShrZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUFkZChwYXRoLCB2YWx1ZSwga2V5KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVBZGQodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCB2YWx1ZSwga2V5KSk7XG4gICAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUocGF0aC5jb25jYXQoa2V5KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCksIHRydWUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICByZWZba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaW5kZXggPSBhcnJheS5wYXJzZUFycmF5SW5kZXgoa2V5KTtcbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZi5zcGxpY2UoaW5kZXgsIDAsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZi5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKHBhdGgsIHBhcmVudFBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSBwYXJlbnRQYXRoICE9PSB1bmRlZmluZWQgPyBwYXJlbnRQYXRoIDogdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgIH1cbiAgICBpZiAocGF0aC5sZW5ndGggPCAxKSB7XG4gICAgICB0aGlzLnN0b3JlID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBsYXN0S2V5ID0gcGF0aC5wb3AoKSxcbiAgICAgICAgcmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpLFxuICAgICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICByZWYuc3BsaWNlKGxhc3RLZXksIDEpO1xuICAgIH0gZWxzZSBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGRlbGV0ZSByZWZbbGFzdEtleV07XG4gICAgfVxuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUsIHBhcmVudFBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSBwYXJlbnRQYXRoICE9PSB1bmRlZmluZWQgPyBwYXJlbnRQYXRoIDogdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgcGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciBsYXN0S2V5ID0gdm9pZCAwLFxuICAgICAgICBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmIChmdWxsUGF0aCkge1xuICAgICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB2YWx1ZSkpO1xuICAgICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUoZnVsbFBhdGgsIHRoaXMuZ2V0KGZ1bGxQYXRoKSkpO1xuICAgICAgfVxuICAgICAgbGFzdEtleSA9IGZ1bGxQYXRoLnBvcCgpO1xuICAgICAgaWYgKGxhc3RLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpW2xhc3RLZXldID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSBpZiAoZm9yY2VVcGRhdGUgPT09IHRydWUgJiYgcGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBsYXN0S2V5ID0gcGF0aC5wb3AoKTtcbiAgICAgIHJldHVybiB0aGlzLmFkZChwYXRoLCB2YWx1ZSwgbGFzdEtleSwgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24gc2V0KHBhdGgsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHBhdGgsIHZhbHVlLCB0cnVlLCB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKSk7XG4gIH0sXG4gIG1vdmVVcDogZnVuY3Rpb24gbW92ZVVwKHBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoLCB0cnVlKTtcbiAgfSxcbiAgbW92ZURvd246IGZ1bmN0aW9uIG1vdmVEb3duKHBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoKTtcbiAgfSxcbiAgbW92ZVRvOiBmdW5jdGlvbiBtb3ZlVG8oZnJvbSwgdG8sIGtleSkge1xuICAgIHZhciBwYXJlbnRGcm9tUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgoZnJvbSwgZmFsc2UpLFxuICAgICAgICBwYXJlbnRUb1BhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRvLCBmYWxzZSk7XG4gICAgZnJvbSA9IHRoaXMuX2dldEZ1bGxQYXRoKGZyb20pO1xuICAgIHRvID0gdGhpcy5fZ2V0RnVsbFBhdGgodG8pO1xuICAgIGlmICghZnJvbSB8fCAhdG8gfHwgIXV0aWxzLmlzUmVmZXJlbmNlVHlwZSh0aGlzLl9nZXRSZWYodG8pKSkgcmV0dXJuIHRoaXM7XG4gICAgdGhpcy5hZGQodG8sIHRoaXMuX2dldFJlZihmcm9tKSwga2V5LCBwYXJlbnRUb1BhdGgpO1xuICAgIHRoaXMucmVtb3ZlKGZyb20sIHBhcmVudEZyb21QYXRoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZXhjaGFuZ2U6IGZ1bmN0aW9uIGV4Y2hhbmdlKGZyb20sIHRvKSB7XG4gICAgdmFyIHBhcmVudEZyb21QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChmcm9tLCBmYWxzZSksXG4gICAgICAgIHBhcmVudFRvUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodG8sIGZhbHNlKTtcbiAgICBmcm9tID0gdGhpcy5fZ2V0RnVsbFBhdGgoZnJvbSk7XG4gICAgdG8gPSB0aGlzLl9nZXRGdWxsUGF0aCh0byk7XG4gICAgaWYgKGZyb20gJiYgdG8pIHtcbiAgICAgIHZhciBmcm9tUmVmID0gdGhpcy5fZ2V0UmVmKGZyb20pLFxuICAgICAgICAgIHRvUmVmID0gdGhpcy5nZXQodG8pO1xuICAgICAgdGhpcy51cGRhdGUoZnJvbSwgdG9SZWYsIGZhbHNlLCBwYXJlbnRGcm9tUGF0aCk7XG4gICAgICB0aGlzLnVwZGF0ZSh0bywgZnJvbVJlZiwgZmFsc2UsIHBhcmVudFRvUGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBleHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ29iamVjdCcpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBhLCBiLCBjLCBkLCBlLCBmKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBvYmplY3QuZXh0ZW5kKHJlZiwgYSwgYiwgYywgZCwgZSwgZik7XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZEFycmF5OiBmdW5jdGlvbiBzcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ2FycmF5Jykge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gdHlwZW9mIGJlZ2luID09PSAnbnVtYmVyJyA/IGJlZ2luIDogcmVmLmxlbmd0aDtcbiAgICBpZiAoISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkQXJyYXkodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBhcnJheS5zcHJlYWRBcnJheShyZWYsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpO1xuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8ICFhcnJheS5pczJkQXJyYXkocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAhKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHR5cGVvZiBiZWdpbiA9PT0gJ251bWJlcicgPyBiZWdpbiA6IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3codGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkMmRBcnJheVJvdyhyZWYsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KTtcbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciByZWYgPSB2b2lkIDA7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSB0eXBlb2YgYmVnaW4gPT09ICdudW1iZXInID8gYmVnaW4gOiByZWZbMF0ubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlDb2wocmVmLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCk7XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24gZ2V0KHBhdGgpIHtcbiAgICBpZiAocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5U3RvcmUgPyB1dGlscy5jb3B5KHRoaXMuX2dldFJlZihwYXRoKSkgOiB0aGlzLl9nZXRSZWYocGF0aCk7XG4gICAgfVxuICB9LFxuICBwYXRjaDogZnVuY3Rpb24gcGF0Y2goKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIG1ldGhvZCBpcyBkZXByZWNhdGVkLCB1c2UgSlNPTlN0b3JlLnBhdGNoIGluc3RlYWQuJyk7XG4gIH0sXG4gIGFwcGx5UGF0Y2g6IGZ1bmN0aW9uIGFwcGx5UGF0Y2gocGF0Y2hlcykge1xuICAgIHBhdGNoZXMgPSB1dGlscy50eXBlKHBhdGNoZXMpID09PSAnYXJyYXknID8gcGF0Y2hlcyA6IFtwYXRjaGVzXTtcbiAgICBwYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICB0aGlzW3BhdGNoLnR5cGVdLmFwcGx5KHRoaXMsIHBhdGNoLmFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbkpTT05EYXRhU3RvcmUuUGF0Y2ggPSBwYXRjaE1ldGhvZHM7XG5cbm1vZHVsZS5leHBvcnRzID0gSlNPTkRhdGFTdG9yZTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFBhdGhMaXN0ZW5lcihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLmRlZXBFcXVhbCA9IG9wdGlvbnMuZGVlcEVxdWFsID09PSB0cnVlO1xuICB0aGlzLmNvcHlTdG9yZSA9IG9wdGlvbnMuY29weVN0b3JlO1xuICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICB0aGlzLmdyb3VwUmVmcyA9IHt9O1xuICB0aGlzLnN0b3JlID0gb3B0aW9ucy5zdG9yZSB8fCB7fTtcbiAgdGhpcy5mbGFzaEtleXMgPSBvcHRpb25zLmZsYXNoS2V5cyB8fCB7fTtcbn1cblxuUGF0aExpc3RlbmVyLnByb3RvdHlwZSA9IHtcbiAgX2NvcHlEYXRhOiBmdW5jdGlvbiBfY29weURhdGEoZGF0YSkge1xuICAgIGlmIChkYXRhID09PSB1bmRlZmluZWQpIHJldHVybiBkYXRhO1xuICAgIHJldHVybiB0aGlzLmNvcHlTdG9yZSA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpIDogZGF0YTtcbiAgfSxcbiAgX3JlbW92ZUxpc3RlbmVyOiBmdW5jdGlvbiBfcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXJzLCBjYikge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gY2IpIHtcbiAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9LFxuICByZWdpc3Rlckxpc3RlbmVyOiBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVyKHBhdGgsIGNiLCBncm91cCkge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHBhdGhJdGVtID0gdm9pZCAwLFxuICAgICAgICB0cmVlUmVmID0gdGhpcy5saXN0ZW5lclRyZWUsXG4gICAgICAgIGxpc3RlbmVySW5kZXggPSB2b2lkIDA7XG4gICAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICAgIHBhdGhJdGVtID0gcGF0aFtpKytdO1xuICAgICAgaWYgKHRyZWVSZWZbcGF0aEl0ZW1dID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJlZVJlZltwYXRoSXRlbV0gPSB7IGNoaWxkcmVuOiB7fSwgbGlzdGVuZXJzOiBbXSB9O1xuICAgICAgfVxuICAgICAgdHJlZVJlZiA9IGkgPT09IGxlbiA/IHRyZWVSZWZbcGF0aEl0ZW1dIDogdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIGxpc3RlbmVySW5kZXggPSB0cmVlUmVmLmxpc3RlbmVycy5wdXNoKGNiKSAtIDE7XG4gICAgaWYgKHR5cGVvZiBncm91cCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICh0aGlzLmdyb3VwUmVmc1tncm91cF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmdyb3VwUmVmc1tncm91cF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZ3JvdXBSZWZzW2dyb3VwXS5wdXNoKFt0cmVlUmVmLmxpc3RlbmVycywgbGlzdGVuZXJJbmRleF0pO1xuICAgIH1cbiAgICBpZiAoZ3JvdXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY2hlY2tQYXRoKHBhdGgpO1xuICAgIH1cbiAgfSxcbiAgY2hlY2tQYXRoOiBmdW5jdGlvbiBjaGVja1BhdGgocGF0aCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBwYXRoSXRlbSA9IHZvaWQgMCxcbiAgICAgICAgdHJlZVJlZiA9IHRoaXMubGlzdGVuZXJUcmVlLFxuICAgICAgICBkYXRhUmVmID0gdGhpcy5zdG9yZTtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgaWYgKGRhdGFSZWYgPT09IHVuZGVmaW5lZCkgYnJlYWs7XG4gICAgICBwYXRoSXRlbSA9IHBhdGhbaSsrXTtcbiAgICAgIGRhdGFSZWYgPSBkYXRhUmVmW3BhdGhJdGVtXTtcbiAgICAgIGlmICh0cmVlUmVmW3BhdGhJdGVtXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRyZWVSZWZbcGF0aEl0ZW1dLmxpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICAgIGxpc3RlbmVyKF90aGlzLl9jb3B5RGF0YShkYXRhUmVmKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0cmVlUmVmID0gdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmZsYXNoS2V5c1twYXRoWzBdXSkge1xuICAgICAgdGhpcy5zdG9yZVtwYXRoWzBdXSA9IG51bGw7XG4gICAgfVxuICB9LFxuICByZW1vdmVBbGxMaXN0ZW5lcnM6IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycygpIHtcbiAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgIHRoaXMuZ3JvdXBSZWZzID0ge307XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlQYXRoOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYikge1xuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aCxcbiAgICAgICAgcGF0aEl0ZW0gPSB2b2lkIDAsXG4gICAgICAgIHRyZWVSZWYgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgcGF0aEl0ZW0gPSBwYXRoW2krK107XG4gICAgICBpZiAodHJlZVJlZltwYXRoSXRlbV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgdHJlZVJlZiA9IGkgPT09IGxlbiA/IHRyZWVSZWZbcGF0aEl0ZW1dIDogdHJlZVJlZltwYXRoSXRlbV0uY2hpbGRyZW47XG4gICAgfVxuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVyKHRyZWVSZWYubGlzdGVuZXJzLCBjYik7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlHcm91cDogZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKSB7XG4gICAgdmFyIGdyb3VwTGlzdGVuZXJzID0gdGhpcy5ncm91cFJlZnNbZ3JvdXBdO1xuICAgIGlmIChncm91cExpc3RlbmVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBncm91cExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyKSB7XG4gICAgICAgIHBhaXJbMF0uc3BsaWNlKHBhaXJbMV0sIDEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhdGhMaXN0ZW5lcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHNwbGljZSA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2U7XG5cbnZhciBjcmVhdGVBcnJheSA9IGZ1bmN0aW9uIGNyZWF0ZUFycmF5KGxlbmd0aCwgaW5maWxsaW5nKSB7XG4gIGxlbmd0aCA9IGxlbmd0aCB8fCAwO1xuICB2YXIgYXJyID0gW10sXG4gICAgICBpID0gMDtcbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGFyci5wdXNoKGluZmlsbGluZyA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHV0aWxzLmNvcHkoaW5maWxsaW5nKSk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBpczJkQXJyYXkgPSBmdW5jdGlvbiBpczJkQXJyYXkoYXJyKSB7XG4gIHZhciBpczJkO1xuICBpZiAoaXMyZCA9IHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5JyAmJiBhcnIubGVuZ3RoID4gMCkge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gYXJyLmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpczJkICY9IHV0aWxzLnR5cGUoYXJyW2ldKSA9PT0gJ2FycmF5JztcbiAgICAgIGlmICghaXMyZCkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY3JlYXRlMmRBcnJheSA9IGZ1bmN0aW9uIGNyZWF0ZTJkQXJyYXkocm93LCBjb2wsIGluZmlsbGluZykge1xuICByb3cgPSByb3cgfHwgMDtcbiAgY29sID0gY29sIHx8IDA7XG4gIHZhciBhcnIgPSBuZXcgQXJyYXkocm93KSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IHJvdzsgaSsrKSB7XG4gICAgYXJyW2ldID0gY3JlYXRlQXJyYXkoY29sLCBpbmZpbGxpbmcpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG52YXIgcGFyc2VBcnJheUluZGV4ID0gZnVuY3Rpb24gcGFyc2VBcnJheUluZGV4KGluZGV4KSB7XG4gIHZhciB0eXBlID0gdXRpbHMudHlwZShpbmRleCk7XG4gIGlmICh0eXBlID09PSAnc3RyaW5nJyB8fCB0eXBlID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBwYXJzZUludChpbmRleCk7XG4gIH1cbiAgcmV0dXJuIHZvaWQgMDtcbn07XG5cbnZhciBnZXRBcnJheUluZGV4QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldEFycmF5SW5kZXhCeVZhbHVlKGFyciwgdmFsdWUpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIHZhciB2YWx1ZVR5cGUgPSB1dGlscy50eXBlKHZhbHVlKTtcbiAgICBpZiAodmFsdWVUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgIGxlbiA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgaXRlbTtcbiAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGFycltpXTtcbiAgICAgICAgdmFyIGlzRXF1YWwgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlzRXF1YWwgPSBpdGVtW2tleV0gPT09IHZhbHVlW2tleV07XG4gICAgICAgICAgICBpZiAoIWlzRXF1YWwpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNFcXVhbCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBhcnIuaW5kZXhPZih2YWx1ZSk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgbW92ZUFycmF5SXRlbVVwID0gZnVuY3Rpb24gbW92ZUFycmF5SXRlbVVwKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgIGFycltpbmRleF0gPSBhcnJbaW5kZXggLSAxXTtcbiAgICAgIGFycltpbmRleCAtIDFdID0gY3Vyckl0ZW07XG4gICAgfVxuICB9XG59O1xuXG52YXIgbW92ZUFycmF5SXRlbURvd24gPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtRG93bihhcnIsIGluZGV4KSB7XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICBpbmRleCA9IHBhcnNlQXJyYXlJbmRleChpbmRleCk7XG4gICAgdmFyIGN1cnJJdGVtID0gYXJyW2luZGV4XTtcbiAgICBpZiAoaW5kZXggPCBhcnIubGVuZ3RoIC0gMSkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCArIDFdO1xuICAgICAgYXJyW2luZGV4ICsgMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBzcHJlYWRBcnJheSA9IGZ1bmN0aW9uIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICB2YXIgZGVsZXRlZCA9IFtdO1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIGluZmlsbGluZ1R5cGUgPSB1dGlscy50eXBlKGluZmlsbGluZyk7XG4gICAgaWYgKHNpbXBsZUluZmlsbGluZyA9PT0gdHJ1ZSkge1xuICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoY3JlYXRlQXJyYXkocGFyc2VJbnQoY291bnQpIHx8IDEsIGluZmlsbGluZykpKTtcbiAgICB9IGVsc2UgaWYgKGluZmlsbGluZ1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGluZmlsbGluZykpO1xuICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGlmIChpbmZpbGxpbmcgPiAwKSB7XG4gICAgICAgIHNwbGljZS5hcHBseShhcnIsIFtiZWdpbiwgMF0uY29uY2F0KGNyZWF0ZUFycmF5KGluZmlsbGluZykpKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCBNYXRoLmFicyhpbmZpbGxpbmcpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlSb3cgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Um93KGFyciwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIHJvd3NUeXBlID0gdXRpbHMudHlwZShyb3dzKTtcbiAgaWYgKGlzMmRBcnJheShhcnIpKSB7XG4gICAgdmFyIGNvbENvdW50ID0gYXJyWzBdLmxlbmd0aDtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBzcHJlYWRBcnJheShhcnIsIGJlZ2luLCBjcmVhdGVBcnJheShjb2xDb3VudCwgcm93cyksIHRydWUsIGNvdW50KTtcbiAgICB9IGVsc2UgaWYgKHJvd3NUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKHJvd3MgPiAwKSB7XG4gICAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGNyZWF0ZTJkQXJyYXkocm93cywgY29sQ291bnQpKTtcbiAgICAgIH0gZWxzZSBpZiAocm93cyA8IDApIHtcbiAgICAgICAgZGVsZXRlZCA9IHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIHJvd3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocm93c1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIHJvd3MpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVsZXRlZDtcbn07XG5cbnZhciBzcHJlYWQyZEFycmF5Q29sID0gZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChhcnIsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gIHZhciBkZWxldGVkID0gW10sXG4gICAgICBkZWxldGVkQ29sLFxuICAgICAgY29sc1R5cGUgPSB1dGlscy50eXBlKGNvbHMpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgcm93Q291bnQgPSBhcnIubGVuZ3RoLFxuICAgICAgICBpID0gMDtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29scywgdHJ1ZSwgY291bnQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sc1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgZGVsZXRlZENvbCA9IHNwcmVhZEFycmF5KGFycltpXSwgYmVnaW4sIGNvbHMpO1xuICAgICAgICBpZiAoZGVsZXRlZENvbC5sZW5ndGgpIHtcbiAgICAgICAgICBkZWxldGVkLnB1c2goZGVsZXRlZENvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbHNUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICBmb3IgKDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29sc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzMmRBcnJheTogaXMyZEFycmF5LFxuICBjcmVhdGVBcnJheTogY3JlYXRlQXJyYXksXG4gIGNyZWF0ZTJkQXJyYXk6IGNyZWF0ZTJkQXJyYXksXG4gIHBhcnNlQXJyYXlJbmRleDogcGFyc2VBcnJheUluZGV4LFxuICBnZXRBcnJheUluZGV4QnlWYWx1ZTogZ2V0QXJyYXlJbmRleEJ5VmFsdWUsXG4gIG1vdmVBcnJheUl0ZW1VcDogbW92ZUFycmF5SXRlbVVwLFxuICBtb3ZlQXJyYXlJdGVtRG93bjogbW92ZUFycmF5SXRlbURvd24sXG4gIHNwcmVhZEFycmF5OiBzcHJlYWRBcnJheSxcbiAgc3ByZWFkMmRBcnJheVJvdzogc3ByZWFkMmRBcnJheVJvdyxcbiAgc3ByZWFkMmRBcnJheUNvbDogc3ByZWFkMmRBcnJheUNvbFxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGdldE9iamVjdEtleUJ5VmFsdWUgPSBmdW5jdGlvbiBnZXRPYmplY3RLZXlCeVZhbHVlKG9iaiwgdmFsdWUpIHtcbiAgdmFyIG9iaktleSwgb2JqVmFsdWUsIHZhbHVlS2V5O1xuICBpZiAodXRpbHMudHlwZSh2YWx1ZSkgPT09ICdvYmplY3QnKSB7XG4gICAgb3V0ZXI6IGZvciAob2JqS2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShvYmpLZXkpICYmIHV0aWxzLnR5cGUob2JqVmFsdWUgPSBvYmpbb2JqS2V5XSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZvciAodmFsdWVLZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkodmFsdWVLZXkpICYmIHZhbHVlW3ZhbHVlS2V5XSAhPT0gb2JqVmFsdWVbdmFsdWVLZXldKSB7XG4gICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgb2JqW29iaktleV0gPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBvYmpLZXk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuICB2YXIgdGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuICAgICAgYXJnTGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmdMZW47IGkrKykge1xuICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV0sXG4gICAgICAgIGtleTtcbiAgICBpZiAodXRpbHMudHlwZShzb3VyY2UpID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yIChrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHRhcmdldFtrZXldID0gdXRpbHMuY29weShzb3VyY2Vba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBoYXNPd25Qcm9wZXJ0eTogT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIGdldE9iamVjdEtleUJ5VmFsdWU6IGdldE9iamVjdEtleUJ5VmFsdWVcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBwYXRjaFR5cGVzID0ge1xuICBhZGQ6ICdhZGQnLFxuICByZW1vdmU6ICdyZW1vdmUnLFxuICB1cGRhdGU6ICd1cGRhdGUnLFxuICBzZXQ6ICdzZXQnLFxuICBtb3ZlVXA6ICdtb3ZlVXAnLFxuICBtb3ZlRG93bjogJ21vdmVEb3duJyxcbiAgbW92ZVRvOiAnbW92ZVRvJyxcbiAgZXhjaGFuZ2U6ICdleGNoYW5nZScsXG4gIGV4dGVuZE9iamVjdDogJ2V4dGVuZE9iamVjdCcsXG4gIHNwcmVhZEFycmF5OiAnc3ByZWFkQXJyYXknLFxuICBzcHJlYWQyZEFycmF5Q29sOiAnc3ByZWFkMmRBcnJheUNvbCcsXG4gIHNwcmVhZDJkQXJyYXlSb3c6ICdzcHJlYWQyZEFycmF5Um93J1xufTtcblxudmFyIGNyZWF0ZVBhdGNoID0gZnVuY3Rpb24gY3JlYXRlUGF0Y2godHlwZSwgYXJncykge1xuICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncyk7XG4gIHJldHVybiB1dGlscy5jb3B5KHtcbiAgICB0eXBlOiB0eXBlLFxuICAgIGFyZ3M6IGFyZ3NcbiAgfSk7XG59O1xuXG4vKipcbiAqIGNyZWF0ZSBwYXRjaCBvcGVyYXRpb25zXG4gKiAqL1xuXG52YXIgcGF0Y2hNZXRob2RzID0ge1xuICBjcmVhdGVBZGQ6IGZ1bmN0aW9uIGNyZWF0ZUFkZChwYXRoLCB2YWx1ZSwga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuYWRkLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVSZW1vdmU6IGZ1bmN0aW9uIGNyZWF0ZVJlbW92ZShwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMucmVtb3ZlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVVcGRhdGU6IGZ1bmN0aW9uIGNyZWF0ZVVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy51cGRhdGUsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNldDogZnVuY3Rpb24gY3JlYXRlU2V0KHBhdGgsIHZhbHVlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc2V0LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVXA6IGZ1bmN0aW9uIGNyZWF0ZU1vdmVVcChwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVVwLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlRG93bjogZnVuY3Rpb24gY3JlYXRlTW92ZURvd24ocGF0aCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLm1vdmVEb3duLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVNb3ZlVG86IGZ1bmN0aW9uIGNyZWF0ZU1vdmVUbyhmcm9tLCB0bywga2V5KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZVRvLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeGNoYW5nZTogZnVuY3Rpb24gY3JlYXRlRXhjaGFuZ2UoZnJvbSwgdG8pIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5leGNoYW5nZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlRXh0ZW5kT2JqZWN0OiBmdW5jdGlvbiBjcmVhdGVFeHRlbmRPYmplY3QocGF0aCwgYSwgYiwgYywgZCwgZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4dGVuZE9iamVjdCwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkQXJyYXk6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZEFycmF5KHBhdGgsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWRBcnJheSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheVJvdzogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheVJvdyhwYXRoLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlSb3csIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2w6IGZ1bmN0aW9uIGNyZWF0ZVNwcmVhZDJkQXJyYXlDb2wocGF0aCwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zcHJlYWQyZEFycmF5Q29sLCBhcmd1bWVudHMpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoTWV0aG9kczsiLCIndXNlIHN0cmljdCc7XG5cbnZhciByZWZlcmVuY2VUeXBlcyA9IHtcbiAgJ2FycmF5JzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWVcbn07XG5cbnZhciBjb21tb25LZXlUeXBlcyA9IHtcbiAgJ3N0cmluZyc6IHRydWUsXG4gICdudW1iZXInOiB0cnVlXG59O1xuXG52YXIgdHlwZSA9IGZ1bmN0aW9uIHR5cGUoZGF0YSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGEpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xufTtcblxudmFyIGlzUmVmZXJlbmNlVHlwZSA9IGZ1bmN0aW9uIGlzUmVmZXJlbmNlVHlwZShkYXRhKSB7XG4gIHJldHVybiByZWZlcmVuY2VUeXBlc1t0eXBlKGRhdGEpXSB8fCBmYWxzZTtcbn07XG5cbnZhciBpc0NvbW1vbktleVR5cGUgPSBmdW5jdGlvbiBpc0NvbW1vbktleVR5cGUoa2V5KSB7XG4gIHJldHVybiBjb21tb25LZXlUeXBlc1t0eXBlKGtleSldIHx8IGZhbHNlO1xufTtcblxudmFyIGNvcHkgPSBmdW5jdGlvbiBjb3B5KGRhdGEpIHtcbiAgcmV0dXJuIGlzUmVmZXJlbmNlVHlwZShkYXRhKSA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpIDogZGF0YTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB0eXBlOiB0eXBlLFxuICBjb3B5OiBjb3B5LFxuICBpc1JlZmVyZW5jZVR5cGU6IGlzUmVmZXJlbmNlVHlwZSxcbiAgaXNDb21tb25LZXlUeXBlOiBpc0NvbW1vbktleVR5cGVcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL0pTT05EYXRhU3RvcmUnKTsiXX0=
