const parser = require('cron-parser');

function nextRunFromCron(cronExpr) {
  try {
    const it = parser.parseExpression(cronExpr, { utc: true });
    return it.next().toDate();
  } catch (e) {
    return null;
  }
}

module.exports = { nextRunFromCron };
