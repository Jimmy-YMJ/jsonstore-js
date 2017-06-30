/**
 * options:
 *  store
 *  copyStore
 *  cacheKeys
 *  localStorage
 * **/

const utils = require('./utils');
const array = require('./array');
const object = require('./object');
const patchMethods = require('./patch');
const PathListener = require('./PathListener');
const JSON_STORE_CACHE_KEY_PREFIX = 'JSON_STORE_CACHE_KEY_PREFIX';
const emptyFunc = () => {};

function JSONDataStore(options) {
  options = options || {};
  this.initialOptions = utils.copy(options);
  let store = options.store, copyStore = options.copyStore !== false;
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
  this.pathListener = new PathListener();
  this.initialMutationActionPath = [];
}

JSONDataStore.prototype = {
  _storeUpdated: function () {
    this._updateCache(this.initialMutationActionPath[0]);
    this.pathListener.checkPath(this.initialMutationActionPath, this.store);
  },
  _getCacheKeysMap: function (options) {
    let cacheKeysMap = {};
    if(utils.type(options.cacheKeys) === 'array'){
      options.cacheKeys.forEach(key => {
        if(Object.hasOwnProperty.call(options.store, key)){
          cacheKeysMap[key] = true;
        }
      })
    }
    return cacheKeysMap;
  },
  _getRef: function (path) {
    let ref = this.store, i = 0, len = path.length;
    for(; i < len; i ++){
      ref = ref[path[i]];
    }
    return ref;
  },
  _detectPath: function (path) {
    let detected = [], ref = this.store, i = 0, len = path.length, key, keyType, refType;
    for(; i < len; i ++){
      key = path[i];
      keyType = utils.type(key);
      refType = utils.type(ref);
      if(refType === 'object'){
        if(object.hasOwnProperty.call(key, '__value')){
          let objKey = object.getObjectKeyByValue(ref, key.__value);
          if(objKey){
            ref = ref[objKey];
            detected.push(objKey);
          }else{
            return [];
          }
        }else if(object.hasOwnProperty.call(ref, key)){
          ref = ref[key];
          detected.push(key);
        }else{
          return [];
        }
      }else if(refType === 'array'){
        if(object.hasOwnProperty.call(key, '__value')){
          let index = array.getArrayIndexByValue(ref, key.__value);
          if(index > -1){
            ref = ref[index];
            detected.push(index);
          }else{
            return [];
          }
        }else if(object.hasOwnProperty.call(ref, key)){
          ref = ref[key];
          detected.push(key);
        }else{
          return [];
        }
      }
    }
    return detected;
  },
  _formatPath: function (path, detect) {
    let pathType = utils.type(path);
    if(pathType === 'undefined' || pathType === 'null'){
      path = [];
    }else if(pathType !== 'array'){
      path = [path];
    }
    if(detect !== false){
      let detected = this._detectPath(path);
      if(detected.length === path.length){
        return detected;
      }
      return null;
    }
    return path.slice();
  },
  _moveArrayItem: function (path, moveUp) {
    let fullPath = this._getFullPath(path);
    if(!fullPath || fullPath.length < 1) return this;
    let itemIndex = fullPath.pop(),
      arr = this._getRef(fullPath);
    if(utils.type(arr) !== 'array') return this;
    let method = moveUp === true ? 'createMoveUp' : 'createMoveDown',
      reverseMethod = method === 'createMoveUp' ? 'createMoveDown' : 'createMoveUp';
    if(this.isDoing){
      this.patches.push(patchMethods[method](fullPath.concat(itemIndex)));
      this.relativePatches.push(patchMethods[method](this._getRelativePath(fullPath.concat(itemIndex))));
      if((moveUp === true && itemIndex > 0)
      || (moveUp !== true && itemIndex < arr.length - 1)){
        this.backPatches.unshift(patchMethods[reverseMethod](fullPath.concat(moveUp === true ? itemIndex - 1 : itemIndex + 1)));
      }
    }
    if(moveUp === true){
      array.moveArrayItemUp(arr, itemIndex);
    }else {
      array.moveArrayItemDown(arr, itemIndex);
    }
    this._storeUpdated();
    return this;
  },
  _getFullPath: function (path) {
    if(utils.isReferenceType(path) && path.isFull){
      return path;
    }
    let currentPath = this._formatPath(this.currentPath, false),
      fullPath = currentPath.concat(this._formatPath(path, false)),
      formattedFullPath = this._formatPath(fullPath);
    if(formattedFullPath){
      formattedFullPath.isFull = true;
    }
    return formattedFullPath;
  },
  _getRelativePath: function (fullPath) {
    return fullPath.slice(this.currentPath.length);
  },
  _composeCacheKey: function (key) {
    return this.cacheKeyPrefix + '@' + key;
  },
  _updateCache: function (key) {
    if(this.cacheKeys[key] && this.localStorage && typeof this.localStorage.setItem === 'function'){
      this.localStorage.setItem(this._composeCacheKey(key), this.get(key));
    }
  },
  registerPathListener: function (path, callback, group) {
    this.pathListener.registerListener(path, callback, group);
  },
  removeListenerByPath: function (path, cb) {
    this.pathListener.removeListenerByPath(path, cb);
  },
  removeListenerByGroup: function (group) {
    this.pathListener.removeListenerByGroup(group);
  },
  loadCache: function (success, error) {
    error = typeof error === 'function' ? error : emptyFunc;
    if(this.localStorage && typeof this.localStorage.multiGet === 'function'){
      let cacheKeys = this.initialOptions.cacheKeys || [];
      let composedKeys = cacheKeys.map(key => this._composeCacheKey(key));
      this.localStorage.multiGet(composedKeys, cache => {
        let parsedCache = {};
        composedKeys.forEach((composedKey, index) => {
          let key = cacheKeys[index];
          let cachedValue = cache[composedKey];
          this.set(key, cachedValue === null ? this.get(key) : cachedValue);
          parsedCache[key] = cache[composedKey];
        });
        success(parsedCache);
      }, error);
    }else{
      error('localStorage is undefined');
    }
  },
  reInit: function (options) {
    JSONDataStore.call(this, options || this.initialOptions);
    return this;
  },
  goTo: function (path, addUp) {
    if(!this.isDoing){
      throw new Error('You are using store.goTo outside store.do!');
    }
    if(addUp === true){
      this.currentPath = this._getFullPath(path);
    }else {
      this.currentPath = this._formatPath(path);
    }
    return this;
  },
  do: function (name, action, a, b, c, d, e, f) {
    let result = {};
    this.isDoing = true;
    if(typeof name === 'function'){
      name(this, action, a, b, c, d, e, f);
    }else if(typeof action === 'function'){
      action(this, a, b, c, d, e, f);
    }else {
      throw new Error(`Invalid parameter action.`);
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
  add: function (path, value, key, parentPath) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    let ref, refType;
    path = this._getFullPath(path);
    if(!path || !utils.isReferenceType(ref = this._getRef(path))
      || ((refType = utils.type(ref)) === 'object' && !utils.isCommonKeyType(key))){
      return this;
    }
    if(this.isDoing){
      this.patches.push(patchMethods.createAdd(path, value, key));
      this.relativePatches.push(patchMethods.createAdd(this._getRelativePath(path), value, key));
      if(refType === 'object'){
        this.backPatches.unshift(patchMethods.createRemove(path.concat(key)));
      }else{
        this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path), true));
      }
    }
    if (refType === 'object') {
      ref[key] = value;
    }else{
      let index = array.parseArrayIndex(key);
      if (index !== undefined) {
        ref.splice(index, 0, value);
      } else {
        ref.push(value);
      }
    }
    this._storeUpdated();
    return this;
  },
  remove: function (path, parentPath) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    if(!(path = this._getFullPath(path))) return this;
    if(this.isDoing){
      this.patches.push(patchMethods.createRemove(path));
      this.relativePatches.push(patchMethods.createRemove(this._getRelativePath(path)));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path), true));
    }
    if(path.length < 1){
      this.store = undefined;
      return this;
    }
    let lastKey = path.pop(), ref = this._getRef(path), refType = utils.type(ref);
    if (refType === 'array') {
      ref.splice(lastKey, 1);
    }else if (refType === 'object') {
      delete ref[lastKey];
    }
    this._storeUpdated();
    return this;
  },
  update: function (path, value, forceUpdate, parentPath) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    path = this._formatPath(path, false);
    let lastKey, fullPath = this._getFullPath(path);
    if(fullPath){
      if(this.isDoing){
        this.patches.push(patchMethods.createUpdate(fullPath, value));
        this.relativePatches.push(patchMethods.createUpdate(this._getRelativePath(fullPath), value));
        this.backPatches.unshift(patchMethods.createUpdate(fullPath, this.get(fullPath)));
      }
      lastKey = fullPath.pop();
      if(lastKey !== undefined){
        this._getRef(fullPath)[lastKey] = value;
      }else{
        this.store = value;
      }
      this._storeUpdated();
      return this;
    }else if(forceUpdate === true && path.length > 0){
      lastKey = path.pop();
      return this.add(path, value, lastKey, this.initialMutationActionPath);
    }
    return this;
  },
  set: function (path, value) {
    return this.update(path, value, true, this._formatPath(path));
  },
  moveUp: function (path) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    return this._moveArrayItem(path, true);
  },
  moveDown: function (path) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    return this._moveArrayItem(path);
  },
  moveTo: function (from, to, key) {
    let parentFromPath = this._formatPath(from),
      parentToPath = this._formatPath(to);
    from = this._getFullPath(from);
    to = this._getFullPath(to);
    if(!from || !to || !utils.isReferenceType(this._getRef(to))) return this;
    this.add(to, this._getRef(from), key, parentToPath);
    this.remove(from, parentFromPath);
    return this;
  },
  exchange: function (from, to) {
    let parentFromPath = this._formatPath(from),
      parentToPath = this._formatPath(to);
    from = this._getFullPath(from);
    to = this._getFullPath(to);
    if(from && to){
      let fromRef = this._getRef(from),
        toRef = this.get(to);
      this.update(from, toRef, false, parentFromPath);
      this.update(to, fromRef, false, parentToPath);
    }
    return this;
  },
  extendObject: function (path, a, b, c, d, e, f) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    let ref;
    if(!(path = this._getFullPath(path)) || utils.type(ref = this._getRef(path)) !== 'object') return this;
    if(this.isDoing){
      this.patches.push(patchMethods.createExtendObject.apply(this, arguments));
      this.relativePatches.push(patchMethods.createExtendObject(this._getRelativePath(path), a, b, c, d, e, f));
      this.backPatches.push(patchMethods.createUpdate(path, this.get(path)));
    }
    object.extend(ref, a, b, c, d, e, f);
    this._storeUpdated();
    return this;
  },
  spreadArray: function (path, begin, infilling, simpleInfilling, count) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    let ref;
    if(!(path = this._getFullPath(path)) || utils.type(ref = this._getRef(path)) !== 'array'){
      return this;
    }
    begin = typeof begin === 'number' ? begin : ref.length;
    if(!(utils.type(begin) === 'number')) return this;
    if(this.isDoing){
      this.patches.push(patchMethods.createSpreadArray(path, begin, infilling, simpleInfilling, count));
      this.relativePatches.push(patchMethods.createSpreadArray(this._getRelativePath(path), begin, infilling, simpleInfilling, count));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spreadArray(ref, begin, infilling, simpleInfilling, count);
    this._storeUpdated();
    return this;
  },
  spread2dArrayRow: function (path, begin, rows, simpleInfilling, count) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    let ref;
    if(!(path = this._getFullPath(path)) || !array.is2dArray(ref = this._getRef(path))
      || !(utils.type(begin) === 'number')){
      return this;
    }
    begin = typeof begin === 'number' ? begin : ref.length;
    if(!(utils.type(begin) === 'number')) return this;
    if(this.isDoing){
      this.patches.push(patchMethods.createSpread2dArrayRow(path, begin, rows, simpleInfilling, count));
      this.relativePatches.push(patchMethods.createSpread2dArrayRow(this._getRelativePath(path), begin, rows, simpleInfilling, count));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayRow(ref, begin, rows, simpleInfilling, count);
    this._storeUpdated();
    return this;
  },
  spread2dArrayCol: function (path, begin, cols, simpleInfilling, count) {
    this.initialMutationActionPath = parentPath !== undefined ? parentPath : this._formatPath(path);
    let ref;
    if(!(path = this._getFullPath(path)) || !array.is2dArray(ref = this._getRef(path))
      || !(utils.type(begin) === 'number')){
      return this;
    }
    begin = typeof begin === 'number' ? begin : ref[0].length;
    if(!(utils.type(begin) === 'number')) return this;
    if(this.isDoing){
      this.patches.push(patchMethods.createSpread2dArrayCol(path, begin, cols, simpleInfilling, count));
      this.relativePatches.push(patchMethods.createSpread2dArrayCol(this._getRelativePath(path), begin, cols, simpleInfilling, count));
      this.backPatches.unshift(patchMethods.createUpdate(path, this.get(path)));
    }
    array.spread2dArrayCol(ref, begin, cols, simpleInfilling, count);
    this._storeUpdated();
    return this;
  },
  get: function (path, copy) {
    if(path = this._getFullPath(path)){
      return copy === false ? this._getRef(path) : utils.copy(this._getRef(path));
    }
  },
  patch: function () {
    throw new Error('This method is deprecated, use JSONStore.patch instead.');
  },
  applyPatch: function (patches) {
    patches = utils.type(patches) === 'array' ? patches : [patches];
    patches.forEach(function (patch) {
      this[patch.type].apply(this, patch.args)
    }.bind(this));
    return this;
  }
};

JSONDataStore.Patch = patchMethods;

module.exports = JSONDataStore;
