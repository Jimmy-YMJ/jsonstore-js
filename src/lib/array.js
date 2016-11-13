const utils = require('./utils');

const splice = Array.prototype.splice;

const createArray = function(length, infilling){
  length = length || 0;
  var arr = [], i = 0;
  for(; i < length; i ++){
    arr.push(infilling === undefined ? null : infilling);
  }
  return arr;
};

const is2dArray = function (arr) {
  var is2d;
  if(is2d = (utils.type(arr) === 'array' && arr.length > 0)){
    var i = 0, len = arr.length;
    for(; i < len; i ++){
      is2d &= utils.type(arr[i]) === 'array';
      if(!is2d) return false;
    }
    return true;
  }
  return false;
};

const create2dArray = function(row, col, infilling){
  row = row || 0;
  col = col || 0;
  var arr = new Array(row), i = 0;
  for(; i < row; i ++){
    arr[i] = createArray(col, infilling);
  }
  return arr;
};

const parseArrayIndex = function(index){
  var type = utils.type(index);
  if(type === 'string' || type === 'number'){
    return parseInt(index);
  }
  return void 0;
};

const getArrayIndexByValue = function (arr, value) {
  if(utils.type(arr) === 'array'){
    var valueType = utils.type(value);
    if(valueType === 'object'){
      var i = 0, len = arr.length, item;
      for(; i < len; i ++){
        item = arr[i];
        var isEqual = false;
        for(var key in value){
          if(value.hasOwnProperty(key)){
            isEqual = item[key] === value[key];
            if(!isEqual) break;
          }
        }
        if(isEqual){
          return i;
        }
      }
      return -1;
    }else{
      return arr.indexOf(value);
    }
  }
};

const moveArrayItemUp = function (arr, index) {
  if(utils.type(arr) === 'array'){
    index = parseArrayIndex(index);
    var currItem = arr[index];
    if (index > 0) {
      arr[index] = arr[index - 1];
      arr[index - 1] = currItem;
    }
  }
};

const moveArrayItemDown = function (arr, index) {
  if(utils.type(arr) === 'array'){
    index = parseArrayIndex(index);
    var currItem = arr[index];
    if (index < arr.length - 1) {
      arr[index] = arr[index + 1];
      arr[index + 1] = currItem;
    }
  }
};

const spreadArray = function (arr, begin, infilling, simpleInfilling, count) {
  var deleted = [];
  if(utils.type(arr) === 'array'){
    var infillingType = utils.type(infilling);
    if(simpleInfilling === true){
      splice.apply(arr, [begin, 0].concat(createArray(parseInt(count) || 1, infilling)));
    }else if(infillingType === 'array'){
      splice.apply(arr, [begin, 0].concat(infilling))
    }else if(infillingType === 'number'){
      if(infilling > 0){
        splice.apply(arr, [begin, 0].concat(createArray(infilling)))
      }else if(infilling < 0){
        deleted = splice.apply(arr, [begin, Math.abs(infilling)]);
      }
    }
  }
  return deleted;
};

const spread2dArrayRow = function (arr, begin, rows, simpleInfilling, count) {
  var deleted = [], rowsType = utils.type(rows);
  if(is2dArray(arr)){
    var colCount = arr[0].length;
    if(simpleInfilling === true){
      spreadArray(arr, begin, createArray(colCount, rows), true, count);
    }else if(rowsType === 'number'){
      if(rows > 0){
        spreadArray(arr, begin, create2dArray(rows, colCount));
      }else if(rows < 0){
        deleted = spreadArray(arr, begin, rows);
      }
    }else if(rowsType === 'array'){
      spreadArray(arr, begin, rows);
    }
  }
  return deleted;
};

const spread2dArrayCol = function (arr, begin, cols, simpleInfilling, count) {
  var deleted = [], deletedCol, colsType = utils.type(cols);
  if(is2dArray(arr)){
    var rowCount = arr.length, i = 0;
    if(simpleInfilling === true){
      for(; i < rowCount; i ++){
        spreadArray(arr[i], begin, cols, true, count);
      }
    } else if(colsType === 'number'){
      for(; i < rowCount; i ++){
        deletedCol = spreadArray(arr[i], begin, cols);
        if(deletedCol.length){
          deleted.push(deletedCol);
        }
      }
    }else if(colsType === 'array'){
      for(; i < rowCount; i ++){
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
