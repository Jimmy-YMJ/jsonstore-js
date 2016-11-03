const referenceTypes = {
  'array': true,
  'object': true
};

const commonKeyTypes = {
  'string': true,
  'number': true
};

const type = data => Object.prototype.toString.call(data).slice(8, -1).toLowerCase();

const isReferenceType = data => referenceTypes[type(data)] || false;

const isCommonKeyType = key => commonKeyTypes[type(key)] || false;

const copy = data => isReferenceType(data) ? JSON.parse(JSON.stringify(data)) : data;

module.exports = {
  type: type,
  copy: copy,
  isReferenceType: isReferenceType,
  isCommonKeyType: isCommonKeyType
};
