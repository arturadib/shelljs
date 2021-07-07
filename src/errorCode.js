var common = require('./common');

//@
//@ ### errorCode()
//@
//@ Returns the error code from the last command.
function errorCode() {
  return common.state.errorCode;
}
module.exports = errorCode;
