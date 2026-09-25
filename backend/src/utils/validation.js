/**
 * validation.js — small reusable checks used by every feature's
 * *.validation.js file. Keeps validation rules consistent app-wide.
 *
 * NOTE: these checks do NOT replace the database's CHECK constraints
 * (schema v3). Both layers exist on purpose (defense in depth) — this
 * layer just gives a clean 400 error instead of a raw Postgres 23514.
 */
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
