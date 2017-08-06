const assert = require('assert');
const moment = require('moment'); require('moment-duration-format');

const normalizeString =  (str) => {
  return str.toLowerCase().replace(/[^a-z]/g, '');
};

exports.normalizeString = normalizeString;

exports.convertFormatToSeconds = (formatString) => {
  const time = moment(formatString, "hh:mm:ss,SSS");
  return moment.duration({
    hours: time.hours(),
    minutes: time.minutes(),
    seconds: time.seconds(),
    milliseconds: time.milliseconds()
  }).asSeconds();
};

exports.convertSecondsToFormat = (seconds) => {
  assert(/[0-9]+(\.[0-9]{2})?/.test(String(seconds))); // IBM Watson gives a time as floating number, example: 30.50
  return moment.duration(seconds * 1000, "milliseconds").format('hh:mm:ss,SSS', { trim: false })
};
