let _ = require('lodash');
let assert = require('assert');
let moment = require('moment'); require('moment-duration-format');

let Combiner = {};

let convertRecognitionTimeToSubtitleTime = (recognitionTime) => {
  assert(/[0-9]+(\.[0-9]{2})?/.test(String(recognitionTime))); // IBM Watson gives a time as floating number, example: 30.50
  return moment.duration(recognitionTime * 1000, "milliseconds").format('hh:mm:ss,SSS', { trim: false })
}

Combiner.combine = (subtitle, recognitionResult) => {
  return new Promise((resolve, reject) => {
    // Map-reduce here: converts the raw results to list of word.
    // recognitionWordList should be like: [{ text, startTime, endTime }, ...]
    const recognitionWordList = recognitionResult.results
      .map((transcript) => {
        assert(transcript.alternatives.length === 1); // IBM watson default setting. Disable it if needed.
        return transcript.alternatives[0].timestamps.map((timestamp) => {
          const { 0: text, 1: startTime, 2: endTime } = timestamp;
          return {
            text: text,
            startTime: startTime,
            endTime: endTime,
          };
        })
      })
      .reduce((a, b) => a.concat(b))
      .filter((word) => !word.text.startsWith('%')) // Remove non-text units like "%HESITATION"
      .map((word, index) => {
        return {
          id: index+1,
          text: word.text.toLowerCase().replace(/[^a-z]/g, ''),
          startTime: convertRecognitionTimeToSubtitleTime(word.startTime),
          endTime: convertRecognitionTimeToSubtitleTime(word.endTime)
        };
      });

    // TODO:
    resolve(recognitionWordList);
  });
};

module.exports = Combiner;
