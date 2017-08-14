function PathListener(options) {
  options = options || {};
  this.deepEqual = options.deepEqual === true;
  this.copyStore = options.copyStore;
  this.listenerTree = {};
  this.groupRefs = {};
  this.store = options.store || {};
  this.flashKeys = options.flashKeys || {};
  this._recordRegisterData = false;
  this._registerDataCollection = [];
}

PathListener.prototype = {
  _copyData: function (data) {
    if(data === undefined) return data;
    return this.copyStore ? JSON.parse(JSON.stringify(data)) : data;
  },
  _removeListener: function (listeners, cb) {
    let index = listeners.indexOf(cb);
    index > -1 && (listeners[index] = null);
    return index;
  },
  registerStart: function () {
    this._registerDataCollection = [];
    this._recordRegisterData = true;
  },
  registerEnd: function (cb) {
    cb(this._registerDataCollection.slice());
    this._recordRegisterData = false;
    this._registerDataCollection = [];
  },
  registerListener: function (path, cb, group, callListener) {
    group = typeof group === 'string' ? group : null;
    callListener = group === null ? group !== false : callListener !== false;
    let i = 0, len = path.length, pathItem, treeRef = this.listenerTree, listenerIndex;
    while (i < len){
      pathItem = path[i ++];
      if(treeRef[pathItem] === undefined){
        treeRef[pathItem] = { children: {}, listeners: [] };
      }
      treeRef = i === len ? treeRef[pathItem] : treeRef[pathItem].children;
    }
    listenerIndex = treeRef.listeners.indexOf(cb);
    listenerIndex = listenerIndex === -1 ? treeRef.listeners.push(cb) - 1 : listenerIndex;
    if(group !== null){
      if(this.groupRefs[group] === undefined){
        this.groupRefs[group] = [];
      }
      this.groupRefs[group].push([treeRef.listeners, listenerIndex]);
    }
    if(callListener || this._recordRegisterData){
      this._registerDataCollection.push(this._traversePath(path, callListener));
    }
  },
  checkPath: function (path) {
    return this._traversePath(path, true);
  },
  _traversePath: function (path, callListener) {
    let i = 0, len = path.length, pathItem, treeRef = this.listenerTree, dataRef = this.store;
    while (i < len){
      if(dataRef === undefined) break;
      pathItem = path[i ++];
      dataRef = dataRef[pathItem];
      if(callListener !== true) continue;
      if(treeRef[pathItem] !== undefined){
        treeRef[pathItem].listeners.forEach(listener => {
          typeof listener === 'function' && listener(this._copyData(dataRef));
        });
        treeRef = treeRef[pathItem].children;
      }
    }
    let finalData = this._copyData(dataRef);
    if(path.length === 1 && this.flashKeys[path[0]]){
      this.store[path[0]] = null;
    }
    return finalData;
  },
  removeAllListeners: function () {
    this.listenerTree = {};
    this.groupRefs = {};
  },
  removeListenerByPath: function (path, cb) {
    if(typeof cb !== 'function') return void 0;
    let i = 0, len = path.length, pathItem, treeRef = this.listenerTree;
    while (i < len){
      pathItem = path[i ++];
      if(treeRef[pathItem] === undefined){
        return void 0;
      }
      treeRef = i === len ? treeRef[pathItem] : treeRef[pathItem].children;
    }
    this._removeListener(treeRef.listeners, cb);
  },
  removeListenerByGroup: function (group) {
    let groupListeners = this.groupRefs[group];
    if(groupListeners !== undefined){
      groupListeners.forEach(pair => {
        typeof pair[0][pair[1]] === 'function' && (pair[0][pair[1]] = null);
      })
    }
  }
};

module.exports = PathListener;
