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

exports.getRecognizedWordList = (recognitionResult) => {
  // Map-reduce here: converts the raw results to list of word.
  // The returning object should be like: [{ text, startTime, endTime }, ...]
  return recognitionResult.results
    .map((transcript) => {
      assert(transcript.alternatives.length === 1); // IBM watson default setting. Disable it if needed.
      return transcript.alternatives[0].timestamps.map((timestamp) => {
        const { 0: text, 1: startTime, 2: endTime } = timestamp;
        return { text, startTime, endTime };
      })
    })
    .reduce((a, b) => a.concat(b))
    .filter((word) => !word.text.startsWith('%')) // Remove non-text units like "%HESITATION"
    .map((word, index) => {
      return {
        id: index+1,
        text: normalizeString(word.text),
        startTime: word.startTime,
        endTime: word.endTime
      };
    });
};
