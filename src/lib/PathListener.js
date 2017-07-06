function PathListener(options) {
  options = options || {};
  this.deepEqual = options.deepEqual === true;
  this.copyStore = options.copyStore;
  this.listenerTree = {};
  this.groupRefs = {};
  this.store = options.store || {};
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
        listeners.splice(i, 1);
        break;
      }
      i ++;
    }
  },
  registerListener: function (path, cb, group) {
    let i = 0, len = path.length, pathItem, treeRef = this.listenerTree, listenerIndex;
    while (i < len){
      pathItem = path[i ++];
      if(treeRef[pathItem] === undefined){
        treeRef[pathItem] = { children: {}, listeners: [] };
      }
      treeRef = i === len ? treeRef[pathItem] : treeRef[pathItem].children;
    }
    listenerIndex = treeRef.listeners.push(cb) - 1;
    if(typeof group === 'string'){
      if(this.groupRefs[group] === undefined){
        this.groupRefs[group] = [];
      }
      this.groupRefs[group].push([treeRef.listeners, listenerIndex]);
    }
    if(group === true){
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
          listener(this._copyData(dataRef));
        })
      }else{
        break;
      }
      treeRef = treeRef[pathItem].children;
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
        pair[0].splice(pair[1], 1);
      })
    }
  }
};

module.exports = PathListener;
