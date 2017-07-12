const _ = require('lodash');
const assert = require('assert');
const fs = require('fs');
const moment = require('moment'); require('moment-duration-format');
const subtitlesParser = require('subtitles-parser');

const convertSubtitleTimeToSeconds = (subtitleTimeString) => {
  const time = moment(subtitleTimeString, "hh:mm:ss,SSS");
  return moment.duration({
    hours: time.hours(),
    minutes: time.minutes(),
    seconds: time.seconds(),
    milliseconds: time.milliseconds()
  }).asSeconds();
}

const getJaccardIndexInternal = (a, b) => {
  assert(typeof a.start === 'number');
  assert(typeof a.end === 'number');
  assert(a.start < a.end);
  assert(typeof b.start === 'number');
  assert(typeof b.end === 'number');
  assert(b.start < b.end);

  const intersection = _.max([0, _.min([a.end, b.end]) - _.max([a.start, b.start])]);
  const union = (a.end - a.start) + (b.end - b.start) - intersection;

  return intersection / union;
};

const mean = array => _.round(_.mean(array), 2);
const zeros = n => _.fill(_.range(n), 0);

const getJaccardIndex = (a, b) => {
  const aSeconds = {
    start: convertSubtitleTimeToSeconds(a.startTime),
    end: convertSubtitleTimeToSeconds(a.endTime),
  };
  const bSeconds = {
    start: convertSubtitleTimeToSeconds(b.startTime),
    end: convertSubtitleTimeToSeconds(b.endTime),
  }
  return getJaccardIndexInternal(aSeconds, bSeconds);
};

const accuracyCommand = (outputFilepath, groundTruthFilepath, options) => {
  if (!outputFilepath) return console.error('The output subtitle file must be given');
  if (!groundTruthFilepath) return console.error('The ground truth subtitle file must be given');

  const output = subtitlesParser.fromSrt(fs.readFileSync(outputFilepath, 'utf-8'));
  const groundTruth = subtitlesParser.fromSrt(fs.readFileSync(groundTruthFilepath, 'utf-8'));

  const accuracies = [];
  let from = 0;
  output.forEach((outputItem) => {
    const index = _.findIndex(groundTruth, item => item.text === outputItem.text, from);
    from = index + 1;
    accuracies.push(getJaccardIndex(outputItem, groundTruth[index]));
  });

  const missingCount = groundTruth.length - output.length;

  console.log(`Accuracy without missing: ${mean(accuracies)}`);
  console.log(`Accuracy with missing: ${mean(_.concat(accuracies, zeros(missingCount)))}`);
};

module.exports = accuracyCommand;
