let _ = require('lodash');

const { convertSecondsToFormat, normalizeString, getRecognizedWordList } = require('./utils');

let Combiner = {};

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

const dropUnlikelyCandidates = (sentenceCandidates) => {
  const maxLength = _.max(sentenceCandidates.map((candidate) => candidate.length));
  return _.filter(sentenceCandidates, (candidate) => candidate.length === maxLength);
}

const findLIS = (candidates) => {
  let lisTable = _.times(candidates.length, _.constant(0));
  for (let i = 0; i < candidates.length; i++) {
    const max = candidates
      .map((candidate, index) => {
        const { startTime, endTime, sentenceId } = candidate;
        return { startTime, endTime, sentenceId, index };
      })
      .filter((candidate) => {
        const { startTime, endTime, sentenceId, index } = candidate;
        return endTime <= candidates[i].startTime && sentenceId < candidates[i].sentenceId;
      })
      .map((candidate) => lisTable[candidate.index])
      .reduce((a, b) => a > b ? a : b, 0);
    lisTable[i] = max + 1;
  }
  let nextSequenceLength = _.reduce(lisTable, (a, b) => _.max([a, b]));
  let lastSequenceId = 987654321;
  let lis = [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (lisTable[i] === nextSequenceLength && candidates[i].sentenceId < lastSequenceId) {
      nextSequenceLength--;
      lastSequenceId = candidates[i].sentenceId;
      lis.push(candidates[i]);
    }
  }
  return lis.reverse();
}

Combiner.combine = (subtitle, recognitionResult) => {
  return new Promise((resolve, reject) => {
    const recognizedWordList = getRecognizedWordList(recognitionResult);
    const recognizedWordPositions = getRecognizedWordPositions(recognizedWordList);
    const sentences = _.map(subtitle, (item) => item.text);

    let candidates = sentences
      .map((sentence, sentenceId) => {
        let sentenceCandidates = findSentenceInRecognition(sentence, recognizedWordPositions);
        if (!sentenceCandidates) {
          return [];
        }
        sentenceCandidates = dropUnlikelyCandidates(sentenceCandidates);
        return sentenceCandidates.map((sentenceCandidate) => {
          const firstWord = recognizedWordList[_.head(sentenceCandidate)];
          const lastWord = recognizedWordList[_.last(sentenceCandidate)];
          return {
            startTime: firstWord.startTime,
            endTime: lastWord.endTime,
            sentenceId
          };
        });
      })
      .reduce((a, b) => a.concat(b));

    candidates = _.sortBy(candidates, [(candidate) => candidate.endTime]);
    const lis = findLIS(candidates);
    const newSubtitle = lis.map((candidate, index) => {
      const id = index + 1;
      const text = subtitle[candidate.sentenceId].text;
      const startTime = convertSecondsToFormat(candidate.startTime);
      const endTime = convertSecondsToFormat(candidate.endTime);
      return { id, text, startTime, endTime };
    });
    resolve(newSubtitle);
  });
};

module.exports = Combiner;
