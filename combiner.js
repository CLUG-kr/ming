let _ = require('lodash');
let assert = require('assert');
let moment = require('moment'); require('moment-duration-format');

let Combiner = {};

const normalizeString = (str) => {
  return str.toLowerCase().replace(/[^a-z]/g, '');
}

const convertRecognitionTimeToSubtitleTime = (recognitionTime) => {
  assert(/[0-9]+(\.[0-9]{2})?/.test(String(recognitionTime))); // IBM Watson gives a time as floating number, example: 30.50
  return moment.duration(recognitionTime * 1000, "milliseconds").format('hh:mm:ss,SSS', { trim: false })
}

const getRecognizedWordList = (recognitionResult) => {
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
        startTime: convertRecognitionTimeToSubtitleTime(word.startTime),
        endTime: convertRecognitionTimeToSubtitleTime(word.endTime)
      };
    });
};

const getRecognizedWordPositions = (wordList) => {
  let map = {};
  wordList.forEach((word, index) => {
    if (!map[word.text]) map[word.text] = [];
    map[word.text].push(index);
  });
  return map;
};

const findSentenceInRecognition = (sentence, recognizedWordPositions, offsetTolerate = 3) => {
  return sentence.split(' ')
    .map(normalizeString)
    .map((word) => recognizedWordPositions[word])
    .reduce((prev, curr) => {
      if (!curr) return prev;
      if (!prev) return curr.map((position) => [position]);
      curr.forEach((position) => {
        prev.filter((prevPosArr) => {
          const offset = position - _.last(prevPosArr);
          return offset >= 1 && offset <= offsetTolerate;
        }).forEach((prevPosArr) => {
          prevPosArr.push(position);
        });
      });
      return prev.concat(curr
        .filter((position) => {
          return prev.every((prevPosArr) => _.last(prevPosArr) !== position);
        })
        .map((pos) => [pos]) || []);
    }, null)
};

Combiner.combine = (subtitle, recognitionResult) => {
  return new Promise((resolve, reject) => {
    const recognizedWordList = getRecognizedWordList(recognitionResult);
    const recognizedWordPositions = getRecognizedWordPositions(recognizedWordList);
    const res = findSentenceInRecognition(subtitle[0].text, recognizedWordPositions);

    console.log(JSON.stringify(subtitle[0].text));
    console.log(JSON.stringify(res));

    // TODO:
  });
};

module.exports = Combiner;