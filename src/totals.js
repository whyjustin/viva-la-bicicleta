const yearTotal = require('./yearTotal');
const monthlyTotal = require('./monthlyTotal');
const participants = require('./participants');

module.exports.message = function () {
  return (
    monthlyTotal.message(participants.getCount()) +
    `
  
    ` +
    yearTotal.message()
  );
};
