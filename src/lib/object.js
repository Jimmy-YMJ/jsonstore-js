const utils = require('./utils');

const getObjectKeyByValue = function (obj, value) {
  var objKey, objValue, valueKey;
  if(utils.type(value) === 'object'){
    outer: for(objKey in obj){
      if(obj.hasOwnProperty(objKey) && utils.type(objValue = obj[objKey]) === 'object'){
        for(valueKey in value){
          if(value.hasOwnProperty(valueKey) && value[valueKey] !== objValue[valueKey]){
            continue outer;
          }
        }
        return objKey;
      }
    }
  }else{
    for(objKey in obj){
      if(obj.hasOwnProperty(objKey) && obj[objKey] === value){
        return objKey;
      }
    }
  }
  return undefined;
};

const extend = function () {
  var target = arguments[0], argLen = arguments.length;
  for (var i = 1; i < argLen; i++) {
    var source = arguments[i], key;
    if(utils.type(source) === 'object'){
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
