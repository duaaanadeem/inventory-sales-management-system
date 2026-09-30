const isNonEmptyString = (val) => typeof val === "string" && val.trim().length > 0;

const isValidNumber = (val) =>
  val !== undefined && val !== null && val !== "" && !Number.isNaN(Number(val));

const isNonNegativeNumber = (val) => isValidNumber(val) && Number(val) >= 0;

const isNonNegativeInteger = (val) =>
  isValidNumber(val) && Number.isInteger(Number(val)) && Number(val) >= 0;

const isValidId = (val) =>
  isValidNumber(val) && Number.isInteger(Number(val)) && Number(val) > 0;

module.exports = {
  isNonEmptyString,
  isValidNumber,
  isNonNegativeNumber,
  isNonNegativeInteger,
  isValidId,
};
