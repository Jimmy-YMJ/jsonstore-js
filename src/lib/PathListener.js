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
  _copyData: function (data) {
    if(data === undefined) return data;
    return this.copyStore ? JSON.parse(JSON.stringify(data)) : data;
  },
  _removeListener: function (listeners, cb) {
    let i = 0, len = listeners.length;
    while (i < len){
      if(listeners[i] === cb){
        listeners[i] = null;
      }
      i ++;
    }
  },
  registerListener: function (path, cb, group, check) {
    group = typeof group === 'string' ? group : null;
    check = group === null ? group !== false : check !== false;
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
    if(check){
      this.checkPath(path);
    }
  },
  checkPath: function (path) {
    let i = 0, len = path.length, pathItem, treeRef = this.listenerTree, dataRef = this.store;
    while (i < len){
      if(dataRef === undefined) break;
      pathItem = path[i ++];
      dataRef = dataRef[pathItem];
      if(treeRef[pathItem] !== undefined){
        treeRef[pathItem].listeners.forEach(listener => {
          typeof listener === 'function' && listener(this._copyData(dataRef));
        })
      }else{
        break;
      }
      treeRef = treeRef[pathItem].children;
    }
    if(path.length === 1 && this.flashKeys[path[0]]){
      this.store[path[0]] = null;
    }
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
