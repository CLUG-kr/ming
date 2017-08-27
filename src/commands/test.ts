const _ = require('lodash');

import * as fs from "fs";

import { convertSecondsToFormat } from '../utils';

/* const prettyPrintRecognitionResult = (recognitionFilepath) => {
  const recognitionResult = JSON.parse(fs.readFileSync(recognitionFilepath, 'utf-8'));
  const wordList = getRecognizedWordList(recognitionResult);

  _.forEach(_.take(wordList, 30), obj => {
    console.log(`${convertSecondsToFormat(obj.startTime)} --> ${convertSecondsToFormat(obj.endTime)} ${obj.text}`);
  });
}; */

const testCommand = (testId, ...args) => {
  const rest = args.pop().parent.rawArgs.slice(4);
  console.log(`test: ${testId}`);
  console.log(`rest: ${JSON.stringify(rest)}`);
  switch(testId) {
    case "1":
      /* prettyPrintRecognitionResult(...rest); */
      break;
    default:
      console.error(`unknown testId: ${testId}`);
  }
};

module.exports = testCommand;
