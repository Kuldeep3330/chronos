const { CronExpressionParser } = require('cron-parser');

function nextRunFromCron(cronExpr) {
  try {
    const interval = CronExpressionParser.parse(cronExpr, {
      tz: 'UTC'
    });
    return interval.next().toDate();
  } catch (e) {
    return null;
  }
}

module.exports = { nextRunFromCron };
