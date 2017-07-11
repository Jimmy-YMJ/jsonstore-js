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
        listeners.splice(i, 1);
        break;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9KU09ORGF0YVN0b3JlLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvUGF0aExpc3RlbmVyLmpzIiwiYnVpbGQvbW9kdWxlcy9saWIvYXJyYXkuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9vYmplY3QuanMiLCJidWlsZC9tb2R1bGVzL2xpYi9wYXRjaC5qcyIsImJ1aWxkL21vZHVsZXMvbGliL3V0aWxzLmpzIiwiYnVpbGQvbW9kdWxlcy9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIG9wdGlvbnM6XG4gKiAgc3RvcmVcbiAqICBjb3B5U3RvcmVcbiAqICBjYWNoZUtleXNcbiAqICBsb2NhbFN0b3JhZ2VcbiAqICoqL1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG52YXIgb2JqZWN0ID0gcmVxdWlyZSgnLi9vYmplY3QnKTtcbnZhciBwYXRjaE1ldGhvZHMgPSByZXF1aXJlKCcuL3BhdGNoJyk7XG52YXIgUGF0aExpc3RlbmVyID0gcmVxdWlyZSgnLi9QYXRoTGlzdGVuZXInKTtcbnZhciBKU09OX1NUT1JFX0NBQ0hFX0tFWV9QUkVGSVggPSAnSlNPTl9TVE9SRV9DQUNIRV9LRVlfUFJFRklYJztcbnZhciBlbXB0eUZ1bmMgPSBmdW5jdGlvbiBlbXB0eUZ1bmMoKSB7fTtcblxuZnVuY3Rpb24gSlNPTkRhdGFTdG9yZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLmluaXRpYWxPcHRpb25zID0gdXRpbHMuY29weShvcHRpb25zKTtcbiAgdmFyIHN0b3JlID0gb3B0aW9ucy5zdG9yZSxcbiAgICAgIGNvcHlTdG9yZSA9IG9wdGlvbnMuY29weVN0b3JlICE9PSBmYWxzZTtcbiAgdGhpcy5jb3B5U3RvcmUgPSBjb3B5U3RvcmU7XG4gIHRoaXMuc3RvcmUgPSBjb3B5U3RvcmUgPyB1dGlscy5jb3B5KHN0b3JlKSA6IHN0b3JlO1xuICB0aGlzLmNhY2hlS2V5cyA9IHRoaXMuX2dldFN0b3JlS2V5c01hcChvcHRpb25zLmNhY2hlS2V5cywgdGhpcy5zdG9yZSk7XG4gIHRoaXMuZmxhc2hLZXlzID0gdGhpcy5fZ2V0U3RvcmVLZXlzTWFwKG9wdGlvbnMuZmxhc2hLZXlzLCB0aGlzLnN0b3JlKTtcbiAgdGhpcy5jYWNoZUtleVByZWZpeCA9IG9wdGlvbnMuY2FjaGVLZXlQcmVmaXggfHwgSlNPTl9TVE9SRV9DQUNIRV9LRVlfUFJFRklYO1xuICB0aGlzLmxvY2FsU3RvcmFnZSA9IG9wdGlvbnMubG9jYWxTdG9yYWdlO1xuICAvLyAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgdGhpcy5wYXRjaGVzID0gW107XG4gIHRoaXMucmVsYXRpdmVQYXRjaGVzID0gW107XG4gIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgdGhpcy5jdXJyZW50UGF0aCA9IFtdO1xuICB0aGlzLmlzRG9pbmcgPSBmYWxzZTtcbiAgdGhpcy5wYXRoTGlzdGVuZXIgPSBuZXcgUGF0aExpc3RlbmVyKHsgc3RvcmU6IHRoaXMuc3RvcmUsIGNvcHlTdG9yZTogY29weVN0b3JlLCBmbGFzaEtleXM6IHRoaXMuZmxhc2hLZXlzIH0pO1xuICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSBbXTtcbn1cblxuSlNPTkRhdGFTdG9yZS5wcm90b3R5cGUgPSB7XG4gIF9zdG9yZVVwZGF0ZWQ6IGZ1bmN0aW9uIF9zdG9yZVVwZGF0ZWQoKSB7XG4gICAgdGhpcy5fdXBkYXRlQ2FjaGUodGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoWzBdKTtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5jaGVja1BhdGgodGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoKTtcbiAgfSxcbiAgX2dldFN0b3JlS2V5c01hcDogZnVuY3Rpb24gX2dldFN0b3JlS2V5c01hcChrZXlzLCBzdG9yZSkge1xuICAgIHZhciBrZXlzTWFwID0ge307XG4gICAgaWYgKHV0aWxzLnR5cGUoa2V5cykgPT09ICdhcnJheScpIHtcbiAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChzdG9yZSwga2V5KSkge1xuICAgICAgICAgIGtleXNNYXBba2V5XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4ga2V5c01hcDtcbiAgfSxcbiAgX2dldFJlZjogZnVuY3Rpb24gX2dldFJlZihwYXRoKSB7XG4gICAgdmFyIHJlZiA9IHRoaXMuc3RvcmUsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICByZWYgPSByZWZbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiByZWY7XG4gIH0sXG4gIF9kZXRlY3RQYXRoOiBmdW5jdGlvbiBfZGV0ZWN0UGF0aChwYXRoKSB7XG4gICAgdmFyIGRldGVjdGVkID0gW10sXG4gICAgICAgIHJlZiA9IHRoaXMuc3RvcmUsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsZW4gPSBwYXRoLmxlbmd0aCxcbiAgICAgICAga2V5ID0gdm9pZCAwLFxuICAgICAgICBrZXlUeXBlID0gdm9pZCAwLFxuICAgICAgICByZWZUeXBlID0gdm9pZCAwO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGtleSA9IHBhdGhbaV07XG4gICAgICBrZXlUeXBlID0gdXRpbHMudHlwZShrZXkpO1xuICAgICAgcmVmVHlwZSA9IHV0aWxzLnR5cGUocmVmKTtcbiAgICAgIGlmIChyZWZUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoa2V5LCAnX192YWx1ZScpKSB7XG4gICAgICAgICAgdmFyIG9iaktleSA9IG9iamVjdC5nZXRPYmplY3RLZXlCeVZhbHVlKHJlZiwga2V5Ll9fdmFsdWUpO1xuICAgICAgICAgIGlmIChvYmpLZXkpIHtcbiAgICAgICAgICAgIHJlZiA9IHJlZltvYmpLZXldO1xuICAgICAgICAgICAgZGV0ZWN0ZWQucHVzaChvYmpLZXkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlZiwga2V5KSkge1xuICAgICAgICAgIHJlZiA9IHJlZltrZXldO1xuICAgICAgICAgIGRldGVjdGVkLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVmVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoa2V5LCAnX192YWx1ZScpKSB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuZ2V0QXJyYXlJbmRleEJ5VmFsdWUocmVmLCBrZXkuX192YWx1ZSk7XG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgIHJlZiA9IHJlZltpbmRleF07XG4gICAgICAgICAgICBkZXRlY3RlZC5wdXNoKGluZGV4KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChyZWYsIGtleSkpIHtcbiAgICAgICAgICByZWYgPSByZWZba2V5XTtcbiAgICAgICAgICBkZXRlY3RlZC5wdXNoKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXRlY3RlZDtcbiAgfSxcbiAgX2Zvcm1hdFBhdGg6IGZ1bmN0aW9uIF9mb3JtYXRQYXRoKHBhdGgsIGRldGVjdCkge1xuICAgIHZhciBwYXRoVHlwZSA9IHV0aWxzLnR5cGUocGF0aCk7XG4gICAgaWYgKHBhdGhUeXBlID09PSAndW5kZWZpbmVkJyB8fCBwYXRoVHlwZSA9PT0gJ251bGwnKSB7XG4gICAgICBwYXRoID0gW107XG4gICAgfSBlbHNlIGlmIChwYXRoVHlwZSAhPT0gJ2FycmF5Jykge1xuICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICB9XG4gICAgaWYgKGRldGVjdCAhPT0gZmFsc2UpIHtcbiAgICAgIHZhciBkZXRlY3RlZCA9IHRoaXMuX2RldGVjdFBhdGgocGF0aCk7XG4gICAgICBpZiAoZGV0ZWN0ZWQubGVuZ3RoID09PSBwYXRoLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZGV0ZWN0ZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGguc2xpY2UoKTtcbiAgfSxcbiAgX21vdmVBcnJheUl0ZW06IGZ1bmN0aW9uIF9tb3ZlQXJyYXlJdGVtKHBhdGgsIG1vdmVVcCkge1xuICAgIHZhciBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmICghZnVsbFBhdGggfHwgZnVsbFBhdGgubGVuZ3RoIDwgMSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGl0ZW1JbmRleCA9IGZ1bGxQYXRoLnBvcCgpLFxuICAgICAgICBhcnIgPSB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpO1xuICAgIGlmICh1dGlscy50eXBlKGFycikgIT09ICdhcnJheScpIHJldHVybiB0aGlzO1xuICAgIHZhciBtZXRob2QgPSBtb3ZlVXAgPT09IHRydWUgPyAnY3JlYXRlTW92ZVVwJyA6ICdjcmVhdGVNb3ZlRG93bicsXG4gICAgICAgIHJldmVyc2VNZXRob2QgPSBtZXRob2QgPT09ICdjcmVhdGVNb3ZlVXAnID8gJ2NyZWF0ZU1vdmVEb3duJyA6ICdjcmVhdGVNb3ZlVXAnO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kc1ttZXRob2RdKGZ1bGxQYXRoLmNvbmNhdChpdGVtSW5kZXgpKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kc1ttZXRob2RdKHRoaXMuX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aC5jb25jYXQoaXRlbUluZGV4KSkpKTtcbiAgICAgIGlmIChtb3ZlVXAgPT09IHRydWUgJiYgaXRlbUluZGV4ID4gMCB8fCBtb3ZlVXAgIT09IHRydWUgJiYgaXRlbUluZGV4IDwgYXJyLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kc1tyZXZlcnNlTWV0aG9kXShmdWxsUGF0aC5jb25jYXQobW92ZVVwID09PSB0cnVlID8gaXRlbUluZGV4IC0gMSA6IGl0ZW1JbmRleCArIDEpKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtb3ZlVXAgPT09IHRydWUpIHtcbiAgICAgIGFycmF5Lm1vdmVBcnJheUl0ZW1VcChhcnIsIGl0ZW1JbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFycmF5Lm1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaXRlbUluZGV4KTtcbiAgICB9XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9nZXRGdWxsUGF0aDogZnVuY3Rpb24gX2dldEZ1bGxQYXRoKHBhdGgpIHtcbiAgICBpZiAodXRpbHMuaXNSZWZlcmVuY2VUeXBlKHBhdGgpICYmIHBhdGguaXNGdWxsKSB7XG4gICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG4gICAgdmFyIGN1cnJlbnRQYXRoID0gdGhpcy5fZm9ybWF0UGF0aCh0aGlzLmN1cnJlbnRQYXRoLCBmYWxzZSksXG4gICAgICAgIGZ1bGxQYXRoID0gY3VycmVudFBhdGguY29uY2F0KHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpKSxcbiAgICAgICAgZm9ybWF0dGVkRnVsbFBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKGZ1bGxQYXRoKTtcbiAgICBpZiAoZm9ybWF0dGVkRnVsbFBhdGgpIHtcbiAgICAgIGZvcm1hdHRlZEZ1bGxQYXRoLmlzRnVsbCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmb3JtYXR0ZWRGdWxsUGF0aDtcbiAgfSxcbiAgX2dldFJlbGF0aXZlUGF0aDogZnVuY3Rpb24gX2dldFJlbGF0aXZlUGF0aChmdWxsUGF0aCkge1xuICAgIHJldHVybiBmdWxsUGF0aC5zbGljZSh0aGlzLmN1cnJlbnRQYXRoLmxlbmd0aCk7XG4gIH0sXG4gIF9jb21wb3NlQ2FjaGVLZXk6IGZ1bmN0aW9uIF9jb21wb3NlQ2FjaGVLZXkoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVLZXlQcmVmaXggKyAnQCcgKyBrZXk7XG4gIH0sXG4gIF91cGRhdGVDYWNoZTogZnVuY3Rpb24gX3VwZGF0ZUNhY2hlKGtleSkge1xuICAgIGlmICh0aGlzLmNhY2hlS2V5c1trZXldICYmIHRoaXMubG9jYWxTdG9yYWdlICYmIHR5cGVvZiB0aGlzLmxvY2FsU3RvcmFnZS5zZXRJdGVtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMuX2NvbXBvc2VDYWNoZUtleShrZXkpLCB0aGlzLmdldChrZXkpKTtcbiAgICB9XG4gIH0sXG4gIHJlZ2lzdGVyUGF0aExpc3RlbmVyOiBmdW5jdGlvbiByZWdpc3RlclBhdGhMaXN0ZW5lcihwYXRoLCBjYWxsYmFjaywgZ3JvdXAsIGNoZWNrKSB7XG4gICAgcGF0aCA9IEFycmF5LmlzQXJyYXkocGF0aCkgPyBwYXRoIDogW3BhdGhdO1xuICAgIHRoaXMucGF0aExpc3RlbmVyLnJlZ2lzdGVyTGlzdGVuZXIocGF0aCwgY2FsbGJhY2ssIGdyb3VwLCBjaGVjayk7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlQYXRoOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYWxsYmFjaykge1xuICAgIHBhdGggPSBBcnJheS5pc0FycmF5KHBhdGgpID8gcGF0aCA6IFtwYXRoXTtcbiAgICB0aGlzLnBhdGhMaXN0ZW5lci5yZW1vdmVMaXN0ZW5lckJ5UGF0aChwYXRoLCBjYWxsYmFjayk7XG4gIH0sXG4gIHJlbW92ZUxpc3RlbmVyQnlHcm91cDogZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKSB7XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIucmVtb3ZlTGlzdGVuZXJCeUdyb3VwKGdyb3VwKTtcbiAgfSxcbiAgcmVtb3ZlQWxsTGlzdGVuZXJzOiBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoKSB7XG4gICAgdGhpcy5wYXRoTGlzdGVuZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gIH0sXG4gIGxvYWRDYWNoZTogZnVuY3Rpb24gbG9hZENhY2hlKHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGVycm9yID0gdHlwZW9mIGVycm9yID09PSAnZnVuY3Rpb24nID8gZXJyb3IgOiBlbXB0eUZ1bmM7XG4gICAgaWYgKHRoaXMubG9jYWxTdG9yYWdlICYmIHR5cGVvZiB0aGlzLmxvY2FsU3RvcmFnZS5tdWx0aUdldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIGNhY2hlS2V5cyA9IHRoaXMuaW5pdGlhbE9wdGlvbnMuY2FjaGVLZXlzIHx8IFtdO1xuICAgICAgdmFyIGNvbXBvc2VkS2V5cyA9IGNhY2hlS2V5cy5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gX3RoaXMuX2NvbXBvc2VDYWNoZUtleShrZXkpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmxvY2FsU3RvcmFnZS5tdWx0aUdldChjb21wb3NlZEtleXMsIGZ1bmN0aW9uIChjYWNoZSkge1xuICAgICAgICB2YXIgcGFyc2VkQ2FjaGUgPSB7fTtcbiAgICAgICAgY29tcG9zZWRLZXlzLmZvckVhY2goZnVuY3Rpb24gKGNvbXBvc2VkS2V5LCBpbmRleCkge1xuICAgICAgICAgIHZhciBrZXkgPSBjYWNoZUtleXNbaW5kZXhdO1xuICAgICAgICAgIHZhciBjYWNoZWRWYWx1ZSA9IGNhY2hlW2NvbXBvc2VkS2V5XTtcbiAgICAgICAgICBfdGhpcy5zZXQoa2V5LCBjYWNoZWRWYWx1ZSA9PT0gbnVsbCA/IF90aGlzLmdldChrZXkpIDogY2FjaGVkVmFsdWUpO1xuICAgICAgICAgIHBhcnNlZENhY2hlW2tleV0gPSBjYWNoZVtjb21wb3NlZEtleV07XG4gICAgICAgIH0pO1xuICAgICAgICBzdWNjZXNzKHBhcnNlZENhY2hlKTtcbiAgICAgIH0sIGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3IoJ2xvY2FsU3RvcmFnZSBpcyB1bmRlZmluZWQnKTtcbiAgICB9XG4gIH0sXG4gIHJlSW5pdDogZnVuY3Rpb24gcmVJbml0KG9wdGlvbnMpIHtcbiAgICBKU09ORGF0YVN0b3JlLmNhbGwodGhpcywgb3B0aW9ucyB8fCB0aGlzLmluaXRpYWxPcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZ29UbzogZnVuY3Rpb24gZ29UbyhwYXRoLCBhZGRVcCkge1xuICAgIGlmICghdGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgdXNpbmcgc3RvcmUuZ29UbyBvdXRzaWRlIHN0b3JlLmRvIScpO1xuICAgIH1cbiAgICBpZiAoYWRkVXAgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkbzogZnVuY3Rpb24gX2RvKG5hbWUsIGFjdGlvbiwgYSwgYiwgYywgZCwgZSwgZikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB0aGlzLmlzRG9pbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbmFtZSh0aGlzLCBhY3Rpb24sIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWN0aW9uKHRoaXMsIGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcGFyYW1ldGVyIGFjdGlvbi4nKTtcbiAgICB9XG4gICAgLy8gY29tcG9zZSByZXN1bHRcbiAgICByZXN1bHQucGF0Y2hlcyA9IHRoaXMucGF0Y2hlcztcbiAgICByZXN1bHQucmVsYXRpdmVQYXRjaGVzID0gdGhpcy5yZWxhdGl2ZVBhdGNoZXM7XG4gICAgcmVzdWx0LmJhY2tQYXRjaGVzID0gdGhpcy5iYWNrUGF0Y2hlcztcbiAgICAvLyByZXNldCAnZG8nIGFib3V0IGF0dHJpYnV0ZXNcbiAgICB0aGlzLnBhdGNoZXMgPSBbXTtcbiAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcyA9IFtdO1xuICAgIHRoaXMuYmFja1BhdGNoZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRQYXRoID0gW107XG4gICAgdGhpcy5pc0RvaW5nID0gZmFsc2U7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgYWRkOiBmdW5jdGlvbiBhZGQocGF0aCwgdmFsdWUsIGtleSwgcGFyZW50UGF0aCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHBhcmVudFBhdGggIT09IHVuZGVmaW5lZCA/IHBhcmVudFBhdGggOiB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICB2YXIgcmVmID0gdm9pZCAwLFxuICAgICAgICByZWZUeXBlID0gdm9pZCAwO1xuICAgIHBhdGggPSB0aGlzLl9nZXRGdWxsUGF0aChwYXRoKTtcbiAgICBpZiAoIXBhdGggfHwgIXV0aWxzLmlzUmVmZXJlbmNlVHlwZShyZWYgPSB0aGlzLl9nZXRSZWYocGF0aCkpIHx8IChyZWZUeXBlID0gdXRpbHMudHlwZShyZWYpKSA9PT0gJ29iamVjdCcgJiYgIXV0aWxzLmlzQ29tbW9uS2V5VHlwZShrZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZUFkZChwYXRoLCB2YWx1ZSwga2V5KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVBZGQodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCB2YWx1ZSwga2V5KSk7XG4gICAgICBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUocGF0aC5jb25jYXQoa2V5KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCksIHRydWUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJlZlR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICByZWZba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaW5kZXggPSBhcnJheS5wYXJzZUFycmF5SW5kZXgoa2V5KTtcbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZi5zcGxpY2UoaW5kZXgsIDAsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZi5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKHBhdGgsIHBhcmVudFBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSBwYXJlbnRQYXRoICE9PSB1bmRlZmluZWQgPyBwYXJlbnRQYXRoIDogdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVJlbW92ZShwYXRoKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVSZW1vdmUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSwgdHJ1ZSkpO1xuICAgIH1cbiAgICBpZiAocGF0aC5sZW5ndGggPCAxKSB7XG4gICAgICB0aGlzLnN0b3JlID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBsYXN0S2V5ID0gcGF0aC5wb3AoKSxcbiAgICAgICAgcmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpLFxuICAgICAgICByZWZUeXBlID0gdXRpbHMudHlwZShyZWYpO1xuICAgIGlmIChyZWZUeXBlID09PSAnYXJyYXknKSB7XG4gICAgICByZWYuc3BsaWNlKGxhc3RLZXksIDEpO1xuICAgIH0gZWxzZSBpZiAocmVmVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGRlbGV0ZSByZWZbbGFzdEtleV07XG4gICAgfVxuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShwYXRoLCB2YWx1ZSwgZm9yY2VVcGRhdGUsIHBhcmVudFBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSBwYXJlbnRQYXRoICE9PSB1bmRlZmluZWQgPyBwYXJlbnRQYXRoIDogdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgcGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciBsYXN0S2V5ID0gdm9pZCAwLFxuICAgICAgICBmdWxsUGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpO1xuICAgIGlmIChmdWxsUGF0aCkge1xuICAgICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKGZ1bGxQYXRoLCB2YWx1ZSkpO1xuICAgICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKGZ1bGxQYXRoKSwgdmFsdWUpKTtcbiAgICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUoZnVsbFBhdGgsIHRoaXMuZ2V0KGZ1bGxQYXRoKSkpO1xuICAgICAgfVxuICAgICAgbGFzdEtleSA9IGZ1bGxQYXRoLnBvcCgpO1xuICAgICAgaWYgKGxhc3RLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9nZXRSZWYoZnVsbFBhdGgpW2xhc3RLZXldID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlID0gdmFsdWU7XG4gICAgICB9XG4gICAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSBpZiAoZm9yY2VVcGRhdGUgPT09IHRydWUgJiYgcGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBsYXN0S2V5ID0gcGF0aC5wb3AoKTtcbiAgICAgIHJldHVybiB0aGlzLmFkZChwYXRoLCB2YWx1ZSwgbGFzdEtleSwgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24gc2V0KHBhdGgsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHBhdGgsIHZhbHVlLCB0cnVlLCB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKSk7XG4gIH0sXG4gIG1vdmVVcDogZnVuY3Rpb24gbW92ZVVwKHBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoLCB0cnVlKTtcbiAgfSxcbiAgbW92ZURvd246IGZ1bmN0aW9uIG1vdmVEb3duKHBhdGgpIHtcbiAgICB0aGlzLmluaXRpYWxNdXRhdGlvbkFjdGlvblBhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHBhdGgsIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcy5fbW92ZUFycmF5SXRlbShwYXRoKTtcbiAgfSxcbiAgbW92ZVRvOiBmdW5jdGlvbiBtb3ZlVG8oZnJvbSwgdG8sIGtleSkge1xuICAgIHZhciBwYXJlbnRGcm9tUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgoZnJvbSwgZmFsc2UpLFxuICAgICAgICBwYXJlbnRUb1BhdGggPSB0aGlzLl9mb3JtYXRQYXRoKHRvLCBmYWxzZSk7XG4gICAgZnJvbSA9IHRoaXMuX2dldEZ1bGxQYXRoKGZyb20pO1xuICAgIHRvID0gdGhpcy5fZ2V0RnVsbFBhdGgodG8pO1xuICAgIGlmICghZnJvbSB8fCAhdG8gfHwgIXV0aWxzLmlzUmVmZXJlbmNlVHlwZSh0aGlzLl9nZXRSZWYodG8pKSkgcmV0dXJuIHRoaXM7XG4gICAgdGhpcy5hZGQodG8sIHRoaXMuX2dldFJlZihmcm9tKSwga2V5LCBwYXJlbnRUb1BhdGgpO1xuICAgIHRoaXMucmVtb3ZlKGZyb20sIHBhcmVudEZyb21QYXRoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZXhjaGFuZ2U6IGZ1bmN0aW9uIGV4Y2hhbmdlKGZyb20sIHRvKSB7XG4gICAgdmFyIHBhcmVudEZyb21QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChmcm9tLCBmYWxzZSksXG4gICAgICAgIHBhcmVudFRvUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgodG8sIGZhbHNlKTtcbiAgICBmcm9tID0gdGhpcy5fZ2V0RnVsbFBhdGgoZnJvbSk7XG4gICAgdG8gPSB0aGlzLl9nZXRGdWxsUGF0aCh0byk7XG4gICAgaWYgKGZyb20gJiYgdG8pIHtcbiAgICAgIHZhciBmcm9tUmVmID0gdGhpcy5fZ2V0UmVmKGZyb20pLFxuICAgICAgICAgIHRvUmVmID0gdGhpcy5nZXQodG8pO1xuICAgICAgdGhpcy51cGRhdGUoZnJvbSwgdG9SZWYsIGZhbHNlLCBwYXJlbnRGcm9tUGF0aCk7XG4gICAgICB0aGlzLnVwZGF0ZSh0bywgZnJvbVJlZiwgZmFsc2UsIHBhcmVudFRvUGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBleHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ29iamVjdCcpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVFeHRlbmRPYmplY3QodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBhLCBiLCBjLCBkLCBlLCBmKSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBvYmplY3QuZXh0ZW5kKHJlZiwgYSwgYiwgYywgZCwgZSwgZik7XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHNwcmVhZEFycmF5OiBmdW5jdGlvbiBzcHJlYWRBcnJheShwYXRoLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8IHV0aWxzLnR5cGUocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSAhPT0gJ2FycmF5Jykge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGJlZ2luID0gdHlwZW9mIGJlZ2luID09PSAnbnVtYmVyJyA/IGJlZ2luIDogcmVmLmxlbmd0aDtcbiAgICBpZiAoISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSByZXR1cm4gdGhpcztcbiAgICBpZiAodGhpcy5pc0RvaW5nKSB7XG4gICAgICB0aGlzLnBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5yZWxhdGl2ZVBhdGNoZXMucHVzaChwYXRjaE1ldGhvZHMuY3JlYXRlU3ByZWFkQXJyYXkodGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLmJhY2tQYXRjaGVzLnVuc2hpZnQocGF0Y2hNZXRob2RzLmNyZWF0ZVVwZGF0ZShwYXRoLCB0aGlzLmdldChwYXRoKSkpO1xuICAgIH1cbiAgICBhcnJheS5zcHJlYWRBcnJheShyZWYsIGJlZ2luLCBpbmZpbGxpbmcsIHNpbXBsZUluZmlsbGluZywgY291bnQpO1xuICAgIHRoaXMuX3N0b3JlVXBkYXRlZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBzcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgdGhpcy5pbml0aWFsTXV0YXRpb25BY3Rpb25QYXRoID0gdGhpcy5fZm9ybWF0UGF0aChwYXRoLCBmYWxzZSk7XG4gICAgdmFyIHJlZiA9IHZvaWQgMDtcbiAgICBpZiAoIShwYXRoID0gdGhpcy5fZ2V0RnVsbFBhdGgocGF0aCkpIHx8ICFhcnJheS5pczJkQXJyYXkocmVmID0gdGhpcy5fZ2V0UmVmKHBhdGgpKSB8fCAhKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBiZWdpbiA9IHR5cGVvZiBiZWdpbiA9PT0gJ251bWJlcicgPyBiZWdpbiA6IHJlZi5sZW5ndGg7XG4gICAgaWYgKCEodXRpbHMudHlwZShiZWdpbikgPT09ICdudW1iZXInKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEb2luZykge1xuICAgICAgdGhpcy5wYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3cocGF0aCwgYmVnaW4sIHJvd3MsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMucmVsYXRpdmVQYXRjaGVzLnB1c2gocGF0Y2hNZXRob2RzLmNyZWF0ZVNwcmVhZDJkQXJyYXlSb3codGhpcy5fZ2V0UmVsYXRpdmVQYXRoKHBhdGgpLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkpO1xuICAgICAgdGhpcy5iYWNrUGF0Y2hlcy51bnNoaWZ0KHBhdGNoTWV0aG9kcy5jcmVhdGVVcGRhdGUocGF0aCwgdGhpcy5nZXQocGF0aCkpKTtcbiAgICB9XG4gICAgYXJyYXkuc3ByZWFkMmRBcnJheVJvdyhyZWYsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KTtcbiAgICB0aGlzLl9zdG9yZVVwZGF0ZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgc3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gc3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHRoaXMuaW5pdGlhbE11dGF0aW9uQWN0aW9uUGF0aCA9IHRoaXMuX2Zvcm1hdFBhdGgocGF0aCwgZmFsc2UpO1xuICAgIHZhciByZWYgPSB2b2lkIDA7XG4gICAgaWYgKCEocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB8fCAhYXJyYXkuaXMyZEFycmF5KHJlZiA9IHRoaXMuX2dldFJlZihwYXRoKSkgfHwgISh1dGlscy50eXBlKGJlZ2luKSA9PT0gJ251bWJlcicpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgYmVnaW4gPSB0eXBlb2YgYmVnaW4gPT09ICdudW1iZXInID8gYmVnaW4gOiByZWZbMF0ubGVuZ3RoO1xuICAgIGlmICghKHV0aWxzLnR5cGUoYmVnaW4pID09PSAnbnVtYmVyJykpIHJldHVybiB0aGlzO1xuICAgIGlmICh0aGlzLmlzRG9pbmcpIHtcbiAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHBhdGgsIGJlZ2luLCBjb2xzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSk7XG4gICAgICB0aGlzLnJlbGF0aXZlUGF0Y2hlcy5wdXNoKHBhdGNoTWV0aG9kcy5jcmVhdGVTcHJlYWQyZEFycmF5Q29sKHRoaXMuX2dldFJlbGF0aXZlUGF0aChwYXRoKSwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpKTtcbiAgICAgIHRoaXMuYmFja1BhdGNoZXMudW5zaGlmdChwYXRjaE1ldGhvZHMuY3JlYXRlVXBkYXRlKHBhdGgsIHRoaXMuZ2V0KHBhdGgpKSk7XG4gICAgfVxuICAgIGFycmF5LnNwcmVhZDJkQXJyYXlDb2wocmVmLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCk7XG4gICAgdGhpcy5fc3RvcmVVcGRhdGVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24gZ2V0KHBhdGgpIHtcbiAgICBpZiAocGF0aCA9IHRoaXMuX2dldEZ1bGxQYXRoKHBhdGgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5U3RvcmUgPyB1dGlscy5jb3B5KHRoaXMuX2dldFJlZihwYXRoKSkgOiB0aGlzLl9nZXRSZWYocGF0aCk7XG4gICAgfVxuICB9LFxuICBwYXRjaDogZnVuY3Rpb24gcGF0Y2goKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIG1ldGhvZCBpcyBkZXByZWNhdGVkLCB1c2UgSlNPTlN0b3JlLnBhdGNoIGluc3RlYWQuJyk7XG4gIH0sXG4gIGFwcGx5UGF0Y2g6IGZ1bmN0aW9uIGFwcGx5UGF0Y2gocGF0Y2hlcykge1xuICAgIHBhdGNoZXMgPSB1dGlscy50eXBlKHBhdGNoZXMpID09PSAnYXJyYXknID8gcGF0Y2hlcyA6IFtwYXRjaGVzXTtcbiAgICBwYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHBhdGNoKSB7XG4gICAgICB0aGlzW3BhdGNoLnR5cGVdLmFwcGx5KHRoaXMsIHBhdGNoLmFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbkpTT05EYXRhU3RvcmUuUGF0Y2ggPSBwYXRjaE1ldGhvZHM7XG5cbm1vZHVsZS5leHBvcnRzID0gSlNPTkRhdGFTdG9yZTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFBhdGhMaXN0ZW5lcihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLmRlZXBFcXVhbCA9IG9wdGlvbnMuZGVlcEVxdWFsID09PSB0cnVlO1xuICB0aGlzLmNvcHlTdG9yZSA9IG9wdGlvbnMuY29weVN0b3JlO1xuICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICB0aGlzLmdyb3VwUmVmcyA9IHt9O1xuICB0aGlzLnN0b3JlID0gb3B0aW9ucy5zdG9yZSB8fCB7fTtcbiAgdGhpcy5mbGFzaEtleXMgPSBvcHRpb25zLmZsYXNoS2V5cyB8fCB7fTtcbn1cblxuUGF0aExpc3RlbmVyLnByb3RvdHlwZSA9IHtcbiAgX2NvcHlEYXRhOiBmdW5jdGlvbiBfY29weURhdGEoZGF0YSkge1xuICAgIGlmIChkYXRhID09PSB1bmRlZmluZWQpIHJldHVybiBkYXRhO1xuICAgIHJldHVybiB0aGlzLmNvcHlTdG9yZSA/IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpIDogZGF0YTtcbiAgfSxcbiAgX3JlbW92ZUxpc3RlbmVyOiBmdW5jdGlvbiBfcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXJzLCBjYikge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gY2IpIHtcbiAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9LFxuICByZWdpc3Rlckxpc3RlbmVyOiBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVyKHBhdGgsIGNiLCBncm91cCwgY2hlY2spIHtcbiAgICBncm91cCA9IHR5cGVvZiBncm91cCA9PT0gJ3N0cmluZycgPyBncm91cCA6IG51bGw7XG4gICAgY2hlY2sgPSBncm91cCA9PT0gbnVsbCA/IGdyb3VwICE9PSBmYWxzZSA6IGNoZWNrICE9PSBmYWxzZTtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBwYXRoSXRlbSA9IHZvaWQgMCxcbiAgICAgICAgdHJlZVJlZiA9IHRoaXMubGlzdGVuZXJUcmVlLFxuICAgICAgICBsaXN0ZW5lckluZGV4ID0gdm9pZCAwO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBwYXRoSXRlbSA9IHBhdGhbaSsrXTtcbiAgICAgIGlmICh0cmVlUmVmW3BhdGhJdGVtXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRyZWVSZWZbcGF0aEl0ZW1dID0geyBjaGlsZHJlbjoge30sIGxpc3RlbmVyczogW10gfTtcbiAgICAgIH1cbiAgICAgIHRyZWVSZWYgPSBpID09PSBsZW4gPyB0cmVlUmVmW3BhdGhJdGVtXSA6IHRyZWVSZWZbcGF0aEl0ZW1dLmNoaWxkcmVuO1xuICAgIH1cbiAgICBsaXN0ZW5lckluZGV4ID0gdHJlZVJlZi5saXN0ZW5lcnMucHVzaChjYikgLSAxO1xuICAgIGlmIChncm91cCAhPT0gbnVsbCkge1xuICAgICAgaWYgKHRoaXMuZ3JvdXBSZWZzW2dyb3VwXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBSZWZzW2dyb3VwXSA9IFtdO1xuICAgICAgfVxuICAgICAgdGhpcy5ncm91cFJlZnNbZ3JvdXBdLnB1c2goW3RyZWVSZWYubGlzdGVuZXJzLCBsaXN0ZW5lckluZGV4XSk7XG4gICAgfVxuICAgIGlmIChjaGVjaykge1xuICAgICAgdGhpcy5jaGVja1BhdGgocGF0aCk7XG4gICAgfVxuICB9LFxuICBjaGVja1BhdGg6IGZ1bmN0aW9uIGNoZWNrUGF0aChwYXRoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBpID0gMCxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHBhdGhJdGVtID0gdm9pZCAwLFxuICAgICAgICB0cmVlUmVmID0gdGhpcy5saXN0ZW5lclRyZWUsXG4gICAgICAgIGRhdGFSZWYgPSB0aGlzLnN0b3JlO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBpZiAoZGF0YVJlZiA9PT0gdW5kZWZpbmVkKSBicmVhaztcbiAgICAgIHBhdGhJdGVtID0gcGF0aFtpKytdO1xuICAgICAgZGF0YVJlZiA9IGRhdGFSZWZbcGF0aEl0ZW1dO1xuICAgICAgaWYgKHRyZWVSZWZbcGF0aEl0ZW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJlZVJlZltwYXRoSXRlbV0ubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgbGlzdGVuZXIoX3RoaXMuX2NvcHlEYXRhKGRhdGFSZWYpKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRyZWVSZWYgPSB0cmVlUmVmW3BhdGhJdGVtXS5jaGlsZHJlbjtcbiAgICB9XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAxICYmIHRoaXMuZmxhc2hLZXlzW3BhdGhbMF1dKSB7XG4gICAgICB0aGlzLnN0b3JlW3BhdGhbMF1dID0gbnVsbDtcbiAgICB9XG4gIH0sXG4gIHJlbW92ZUFsbExpc3RlbmVyczogZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKCkge1xuICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgdGhpcy5ncm91cFJlZnMgPSB7fTtcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXJCeVBhdGg6IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyQnlQYXRoKHBhdGgsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGxlbiA9IHBhdGgubGVuZ3RoLFxuICAgICAgICBwYXRoSXRlbSA9IHZvaWQgMCxcbiAgICAgICAgdHJlZVJlZiA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBwYXRoSXRlbSA9IHBhdGhbaSsrXTtcbiAgICAgIGlmICh0cmVlUmVmW3BhdGhJdGVtXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG4gICAgICB0cmVlUmVmID0gaSA9PT0gbGVuID8gdHJlZVJlZltwYXRoSXRlbV0gOiB0cmVlUmVmW3BhdGhJdGVtXS5jaGlsZHJlbjtcbiAgICB9XG4gICAgdGhpcy5fcmVtb3ZlTGlzdGVuZXIodHJlZVJlZi5saXN0ZW5lcnMsIGNiKTtcbiAgfSxcbiAgcmVtb3ZlTGlzdGVuZXJCeUdyb3VwOiBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lckJ5R3JvdXAoZ3JvdXApIHtcbiAgICB2YXIgZ3JvdXBMaXN0ZW5lcnMgPSB0aGlzLmdyb3VwUmVmc1tncm91cF07XG4gICAgaWYgKGdyb3VwTGlzdGVuZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGdyb3VwTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKHBhaXIpIHtcbiAgICAgICAgcGFpclswXS5zcGxpY2UocGFpclsxXSwgMSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGF0aExpc3RlbmVyOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgc3BsaWNlID0gQXJyYXkucHJvdG90eXBlLnNwbGljZTtcblxudmFyIGNyZWF0ZUFycmF5ID0gZnVuY3Rpb24gY3JlYXRlQXJyYXkobGVuZ3RoLCBpbmZpbGxpbmcpIHtcbiAgbGVuZ3RoID0gbGVuZ3RoIHx8IDA7XG4gIHZhciBhcnIgPSBbXSxcbiAgICAgIGkgPSAwO1xuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgYXJyLnB1c2goaW5maWxsaW5nID09PSB1bmRlZmluZWQgPyBudWxsIDogdXRpbHMuY29weShpbmZpbGxpbmcpKTtcbiAgfVxuICByZXR1cm4gYXJyO1xufTtcblxudmFyIGlzMmRBcnJheSA9IGZ1bmN0aW9uIGlzMmRBcnJheShhcnIpIHtcbiAgdmFyIGlzMmQ7XG4gIGlmIChpczJkID0gdXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknICYmIGFyci5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBsZW4gPSBhcnIubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlzMmQgJj0gdXRpbHMudHlwZShhcnJbaV0pID09PSAnYXJyYXknO1xuICAgICAgaWYgKCFpczJkKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjcmVhdGUyZEFycmF5ID0gZnVuY3Rpb24gY3JlYXRlMmRBcnJheShyb3csIGNvbCwgaW5maWxsaW5nKSB7XG4gIHJvdyA9IHJvdyB8fCAwO1xuICBjb2wgPSBjb2wgfHwgMDtcbiAgdmFyIGFyciA9IG5ldyBBcnJheShyb3cpLFxuICAgICAgaSA9IDA7XG4gIGZvciAoOyBpIDwgcm93OyBpKyspIHtcbiAgICBhcnJbaV0gPSBjcmVhdGVBcnJheShjb2wsIGluZmlsbGluZyk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbnZhciBwYXJzZUFycmF5SW5kZXggPSBmdW5jdGlvbiBwYXJzZUFycmF5SW5kZXgoaW5kZXgpIHtcbiAgdmFyIHR5cGUgPSB1dGlscy50eXBlKGluZGV4KTtcbiAgaWYgKHR5cGUgPT09ICdzdHJpbmcnIHx8IHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHBhcnNlSW50KGluZGV4KTtcbiAgfVxuICByZXR1cm4gdm9pZCAwO1xufTtcblxudmFyIGdldEFycmF5SW5kZXhCeVZhbHVlID0gZnVuY3Rpb24gZ2V0QXJyYXlJbmRleEJ5VmFsdWUoYXJyLCB2YWx1ZSkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgdmFyIHZhbHVlVHlwZSA9IHV0aWxzLnR5cGUodmFsdWUpO1xuICAgIGlmICh2YWx1ZVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgbGVuID0gYXJyLmxlbmd0aCxcbiAgICAgICAgICBpdGVtO1xuICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpdGVtID0gYXJyW2ldO1xuICAgICAgICB2YXIgaXNFcXVhbCA9IGZhbHNlO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaXNFcXVhbCA9IGl0ZW1ba2V5XSA9PT0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIGlmICghaXNFcXVhbCkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0VxdWFsKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFyci5pbmRleE9mKHZhbHVlKTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtVXAgPSBmdW5jdGlvbiBtb3ZlQXJyYXlJdGVtVXAoYXJyLCBpbmRleCkge1xuICBpZiAodXRpbHMudHlwZShhcnIpID09PSAnYXJyYXknKSB7XG4gICAgaW5kZXggPSBwYXJzZUFycmF5SW5kZXgoaW5kZXgpO1xuICAgIHZhciBjdXJySXRlbSA9IGFycltpbmRleF07XG4gICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgYXJyW2luZGV4XSA9IGFycltpbmRleCAtIDFdO1xuICAgICAgYXJyW2luZGV4IC0gMV0gPSBjdXJySXRlbTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBtb3ZlQXJyYXlJdGVtRG93biA9IGZ1bmN0aW9uIG1vdmVBcnJheUl0ZW1Eb3duKGFyciwgaW5kZXgpIHtcbiAgaWYgKHV0aWxzLnR5cGUoYXJyKSA9PT0gJ2FycmF5Jykge1xuICAgIGluZGV4ID0gcGFyc2VBcnJheUluZGV4KGluZGV4KTtcbiAgICB2YXIgY3Vyckl0ZW0gPSBhcnJbaW5kZXhdO1xuICAgIGlmIChpbmRleCA8IGFyci5sZW5ndGggLSAxKSB7XG4gICAgICBhcnJbaW5kZXhdID0gYXJyW2luZGV4ICsgMV07XG4gICAgICBhcnJbaW5kZXggKyAxXSA9IGN1cnJJdGVtO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHNwcmVhZEFycmF5ID0gZnVuY3Rpb24gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgaW5maWxsaW5nLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gIHZhciBkZWxldGVkID0gW107XG4gIGlmICh1dGlscy50eXBlKGFycikgPT09ICdhcnJheScpIHtcbiAgICB2YXIgaW5maWxsaW5nVHlwZSA9IHV0aWxzLnR5cGUoaW5maWxsaW5nKTtcbiAgICBpZiAoc2ltcGxlSW5maWxsaW5nID09PSB0cnVlKSB7XG4gICAgICBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIDBdLmNvbmNhdChjcmVhdGVBcnJheShwYXJzZUludChjb3VudCkgfHwgMSwgaW5maWxsaW5nKSkpO1xuICAgIH0gZWxzZSBpZiAoaW5maWxsaW5nVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoaW5maWxsaW5nKSk7XG4gICAgfSBlbHNlIGlmIChpbmZpbGxpbmdUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKGluZmlsbGluZyA+IDApIHtcbiAgICAgICAgc3BsaWNlLmFwcGx5KGFyciwgW2JlZ2luLCAwXS5jb25jYXQoY3JlYXRlQXJyYXkoaW5maWxsaW5nKSkpO1xuICAgICAgfSBlbHNlIGlmIChpbmZpbGxpbmcgPCAwKSB7XG4gICAgICAgIGRlbGV0ZWQgPSBzcGxpY2UuYXBwbHkoYXJyLCBbYmVnaW4sIE1hdGguYWJzKGluZmlsbGluZyldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG52YXIgc3ByZWFkMmRBcnJheVJvdyA9IGZ1bmN0aW9uIHNwcmVhZDJkQXJyYXlSb3coYXJyLCBiZWdpbiwgcm93cywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICB2YXIgZGVsZXRlZCA9IFtdLFxuICAgICAgcm93c1R5cGUgPSB1dGlscy50eXBlKHJvd3MpO1xuICBpZiAoaXMyZEFycmF5KGFycikpIHtcbiAgICB2YXIgY29sQ291bnQgPSBhcnJbMF0ubGVuZ3RoO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIHNwcmVhZEFycmF5KGFyciwgYmVnaW4sIGNyZWF0ZUFycmF5KGNvbENvdW50LCByb3dzKSwgdHJ1ZSwgY291bnQpO1xuICAgIH0gZWxzZSBpZiAocm93c1R5cGUgPT09ICdudW1iZXInKSB7XG4gICAgICBpZiAocm93cyA+IDApIHtcbiAgICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgY3JlYXRlMmRBcnJheShyb3dzLCBjb2xDb3VudCkpO1xuICAgICAgfSBlbHNlIGlmIChyb3dzIDwgMCkge1xuICAgICAgICBkZWxldGVkID0gc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyb3dzVHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgc3ByZWFkQXJyYXkoYXJyLCBiZWdpbiwgcm93cyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWxldGVkO1xufTtcblxudmFyIHNwcmVhZDJkQXJyYXlDb2wgPSBmdW5jdGlvbiBzcHJlYWQyZEFycmF5Q29sKGFyciwgYmVnaW4sIGNvbHMsIHNpbXBsZUluZmlsbGluZywgY291bnQpIHtcbiAgdmFyIGRlbGV0ZWQgPSBbXSxcbiAgICAgIGRlbGV0ZWRDb2wsXG4gICAgICBjb2xzVHlwZSA9IHV0aWxzLnR5cGUoY29scyk7XG4gIGlmIChpczJkQXJyYXkoYXJyKSkge1xuICAgIHZhciByb3dDb3VudCA9IGFyci5sZW5ndGgsXG4gICAgICAgIGkgPSAwO1xuICAgIGlmIChzaW1wbGVJbmZpbGxpbmcgPT09IHRydWUpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzLCB0cnVlLCBjb3VudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb2xzVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBkZWxldGVkQ29sID0gc3ByZWFkQXJyYXkoYXJyW2ldLCBiZWdpbiwgY29scyk7XG4gICAgICAgIGlmIChkZWxldGVkQ29sLmxlbmd0aCkge1xuICAgICAgICAgIGRlbGV0ZWQucHVzaChkZWxldGVkQ29sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sc1R5cGUgPT09ICdhcnJheScpIHtcbiAgICAgIGZvciAoOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgICBzcHJlYWRBcnJheShhcnJbaV0sIGJlZ2luLCBjb2xzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlbGV0ZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXMyZEFycmF5OiBpczJkQXJyYXksXG4gIGNyZWF0ZUFycmF5OiBjcmVhdGVBcnJheSxcbiAgY3JlYXRlMmRBcnJheTogY3JlYXRlMmRBcnJheSxcbiAgcGFyc2VBcnJheUluZGV4OiBwYXJzZUFycmF5SW5kZXgsXG4gIGdldEFycmF5SW5kZXhCeVZhbHVlOiBnZXRBcnJheUluZGV4QnlWYWx1ZSxcbiAgbW92ZUFycmF5SXRlbVVwOiBtb3ZlQXJyYXlJdGVtVXAsXG4gIG1vdmVBcnJheUl0ZW1Eb3duOiBtb3ZlQXJyYXlJdGVtRG93bixcbiAgc3ByZWFkQXJyYXk6IHNwcmVhZEFycmF5LFxuICBzcHJlYWQyZEFycmF5Um93OiBzcHJlYWQyZEFycmF5Um93LFxuICBzcHJlYWQyZEFycmF5Q29sOiBzcHJlYWQyZEFycmF5Q29sXG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZ2V0T2JqZWN0S2V5QnlWYWx1ZSA9IGZ1bmN0aW9uIGdldE9iamVjdEtleUJ5VmFsdWUob2JqLCB2YWx1ZSkge1xuICB2YXIgb2JqS2V5LCBvYmpWYWx1ZSwgdmFsdWVLZXk7XG4gIGlmICh1dGlscy50eXBlKHZhbHVlKSA9PT0gJ29iamVjdCcpIHtcbiAgICBvdXRlcjogZm9yIChvYmpLZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG9iaktleSkgJiYgdXRpbHMudHlwZShvYmpWYWx1ZSA9IG9ialtvYmpLZXldKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZm9yICh2YWx1ZUtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5oYXNPd25Qcm9wZXJ0eSh2YWx1ZUtleSkgJiYgdmFsdWVbdmFsdWVLZXldICE9PSBvYmpWYWx1ZVt2YWx1ZUtleV0pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqS2V5O1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKG9iaktleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkob2JqS2V5KSAmJiBvYmpbb2JqS2V5XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG9iaktleTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiBleHRlbmQoKSB7XG4gIHZhciB0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG4gICAgICBhcmdMZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ0xlbjsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSxcbiAgICAgICAga2V5O1xuICAgIGlmICh1dGlscy50eXBlKHNvdXJjZSkgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdGFyZ2V0W2tleV0gPSB1dGlscy5jb3B5KHNvdXJjZVtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGhhc093blByb3BlcnR5OiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgZ2V0T2JqZWN0S2V5QnlWYWx1ZTogZ2V0T2JqZWN0S2V5QnlWYWx1ZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIHBhdGNoVHlwZXMgPSB7XG4gIGFkZDogJ2FkZCcsXG4gIHJlbW92ZTogJ3JlbW92ZScsXG4gIHVwZGF0ZTogJ3VwZGF0ZScsXG4gIHNldDogJ3NldCcsXG4gIG1vdmVVcDogJ21vdmVVcCcsXG4gIG1vdmVEb3duOiAnbW92ZURvd24nLFxuICBtb3ZlVG86ICdtb3ZlVG8nLFxuICBleGNoYW5nZTogJ2V4Y2hhbmdlJyxcbiAgZXh0ZW5kT2JqZWN0OiAnZXh0ZW5kT2JqZWN0JyxcbiAgc3ByZWFkQXJyYXk6ICdzcHJlYWRBcnJheScsXG4gIHNwcmVhZDJkQXJyYXlDb2w6ICdzcHJlYWQyZEFycmF5Q29sJyxcbiAgc3ByZWFkMmRBcnJheVJvdzogJ3NwcmVhZDJkQXJyYXlSb3cnXG59O1xuXG52YXIgY3JlYXRlUGF0Y2ggPSBmdW5jdGlvbiBjcmVhdGVQYXRjaCh0eXBlLCBhcmdzKSB7XG4gIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzKTtcbiAgcmV0dXJuIHV0aWxzLmNvcHkoe1xuICAgIHR5cGU6IHR5cGUsXG4gICAgYXJnczogYXJnc1xuICB9KTtcbn07XG5cbi8qKlxuICogY3JlYXRlIHBhdGNoIG9wZXJhdGlvbnNcbiAqICovXG5cbnZhciBwYXRjaE1ldGhvZHMgPSB7XG4gIGNyZWF0ZUFkZDogZnVuY3Rpb24gY3JlYXRlQWRkKHBhdGgsIHZhbHVlLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5hZGQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVJlbW92ZTogZnVuY3Rpb24gY3JlYXRlUmVtb3ZlKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5yZW1vdmUsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZVVwZGF0ZTogZnVuY3Rpb24gY3JlYXRlVXBkYXRlKHBhdGgsIHZhbHVlLCBmb3JjZVVwZGF0ZSkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnVwZGF0ZSwgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU2V0OiBmdW5jdGlvbiBjcmVhdGVTZXQocGF0aCwgdmFsdWUpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5zZXQsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVVcDogZnVuY3Rpb24gY3JlYXRlTW92ZVVwKHBhdGgpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVXAsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVEb3duOiBmdW5jdGlvbiBjcmVhdGVNb3ZlRG93bihwYXRoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMubW92ZURvd24sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZU1vdmVUbzogZnVuY3Rpb24gY3JlYXRlTW92ZVRvKGZyb20sIHRvLCBrZXkpIHtcbiAgICByZXR1cm4gY3JlYXRlUGF0Y2gocGF0Y2hUeXBlcy5tb3ZlVG8sIGFyZ3VtZW50cyk7XG4gIH0sXG4gIGNyZWF0ZUV4Y2hhbmdlOiBmdW5jdGlvbiBjcmVhdGVFeGNoYW5nZShmcm9tLCB0bykge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLmV4Y2hhbmdlLCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVFeHRlbmRPYmplY3Q6IGZ1bmN0aW9uIGNyZWF0ZUV4dGVuZE9iamVjdChwYXRoLCBhLCBiLCBjLCBkLCBlKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuZXh0ZW5kT2JqZWN0LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWRBcnJheTogZnVuY3Rpb24gY3JlYXRlU3ByZWFkQXJyYXkocGF0aCwgYmVnaW4sIGluZmlsbGluZywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZEFycmF5LCBhcmd1bWVudHMpO1xuICB9LFxuICBjcmVhdGVTcHJlYWQyZEFycmF5Um93OiBmdW5jdGlvbiBjcmVhdGVTcHJlYWQyZEFycmF5Um93KHBhdGgsIGJlZ2luLCByb3dzLCBzaW1wbGVJbmZpbGxpbmcsIGNvdW50KSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBhdGNoKHBhdGNoVHlwZXMuc3ByZWFkMmRBcnJheVJvdywgYXJndW1lbnRzKTtcbiAgfSxcbiAgY3JlYXRlU3ByZWFkMmRBcnJheUNvbDogZnVuY3Rpb24gY3JlYXRlU3ByZWFkMmRBcnJheUNvbChwYXRoLCBiZWdpbiwgY29scywgc2ltcGxlSW5maWxsaW5nLCBjb3VudCkge1xuICAgIHJldHVybiBjcmVhdGVQYXRjaChwYXRjaFR5cGVzLnNwcmVhZDJkQXJyYXlDb2wsIGFyZ3VtZW50cyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hNZXRob2RzOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlZmVyZW5jZVR5cGVzID0ge1xuICAnYXJyYXknOiB0cnVlLFxuICAnb2JqZWN0JzogdHJ1ZVxufTtcblxudmFyIGNvbW1vbktleVR5cGVzID0ge1xuICAnc3RyaW5nJzogdHJ1ZSxcbiAgJ251bWJlcic6IHRydWVcbn07XG5cbnZhciB0eXBlID0gZnVuY3Rpb24gdHlwZShkYXRhKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0YSkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG52YXIgaXNSZWZlcmVuY2VUeXBlID0gZnVuY3Rpb24gaXNSZWZlcmVuY2VUeXBlKGRhdGEpIHtcbiAgcmV0dXJuIHJlZmVyZW5jZVR5cGVzW3R5cGUoZGF0YSldIHx8IGZhbHNlO1xufTtcblxudmFyIGlzQ29tbW9uS2V5VHlwZSA9IGZ1bmN0aW9uIGlzQ29tbW9uS2V5VHlwZShrZXkpIHtcbiAgcmV0dXJuIGNvbW1vbktleVR5cGVzW3R5cGUoa2V5KV0gfHwgZmFsc2U7XG59O1xuXG52YXIgY29weSA9IGZ1bmN0aW9uIGNvcHkoZGF0YSkge1xuICByZXR1cm4gaXNSZWZlcmVuY2VUeXBlKGRhdGEpID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSkgOiBkYXRhO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHR5cGU6IHR5cGUsXG4gIGNvcHk6IGNvcHksXG4gIGlzUmVmZXJlbmNlVHlwZTogaXNSZWZlcmVuY2VUeXBlLFxuICBpc0NvbW1vbktleVR5cGU6IGlzQ29tbW9uS2V5VHlwZVxufTsiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvSlNPTkRhdGFTdG9yZScpOyJdfQ==
