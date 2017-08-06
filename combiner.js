let _ = require('lodash');
const levenshtein = require('fast-levenshtein');

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

const findCandidatesByRecursion = (items, i, context, cb) => {
  context.push(i);
  cb(_.clone(context));
  items[i].next.forEach(j => {
    findCandidatesByRecursion(items, j, context, cb);
  });
  context.pop();
};

const findSentenceInRecognition = (sentence, recognizedWordPositions, offsetTolerate = 3) => {
  const sentenceWords = sentence.split(' ').map(normalizeString).filter(word => word.length > 0);
  let items = _.sortBy(
    _.flatten(sentenceWords
      .map((word, s_position) => (recognizedWordPositions[word] || [])
      .map(r_position => ({ s_position, r_position, word, next: [] })))),
    item => item.r_position);

  items.forEach((item, i, items) => {
    const remainingWordCountInSentence = (sentenceWords.length - 1 - item.s_position);
    const until_r_position = item.r_position + remainingWordCountInSentence * 2;
    while (items.length > i+1 && items[i+1].r_position <= until_r_position) {
      i++;
      const s_position_diff = items[i].s_position - item.s_position;
      const r_position_diff = items[i].r_position - item.r_position;
      if (s_position_diff > 0 && r_position_diff <= s_position_diff * 2) {
        item.next.push(i);
      }
    }
    if (process.env.NODE_ENV === "DEBUG") console.log(`item=${JSON.stringify(item)} remaining=${remainingWordCountInSentence} until=${until_r_position}`);
  });

  const candidates = [];
  for (let i = 0; i < items.length; i++) {
    findCandidatesByRecursion(items, i, [], (foundCandidate) => {
      candidates.push(foundCandidate.map(pos => items[pos].r_position));
    });
  }
  return (_.takeRight(_.sortBy(candidates, candidate => candidate.length), 20));
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
        const { startTime, endTime, sentenceId, data } = candidate;
        return { startTime, endTime, sentenceId, index, data };
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
            data: {
              sentenceCandidate
            },
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
      return { id, text, startTime, endTime, data: {
        originalId: candidate.sentenceId + 1,
        sentenceCandidate: candidate.data.sentenceCandidate
      }};
    });

    // Interpolation
    let expectWordPosition = 0;
    let expectOriginalId = 1;
    _.flatten(newSubtitle.map((item, i) => {
      const { id, text, startTime, endTime, data: { originalId, sentenceCandidate } } = item;

      const unmatchedPieces = _.slice(subtitle, expectOriginalId - 1, originalId - 1)
      // console.log('piece', unmatchedPieces.map(piece => piece.text));
      expectOriginalId = originalId + 1;

      const unmatchedWords = _.slice(recognizedWordList, expectWordPosition, _.head(sentenceCandidate));
      // console.log('word', unmatchedWords.map(word => word.text));
      expectWordPosition = _.last(sentenceCandidate) + 1;

      const prevItem = newSubtitle[i - 1];
      const currItem = item;

      if (unmatchedWords.length === 0) return [];

      let minDistance = 987654321;
      let minIndex = { prevEnd: -1, currStart: -1 };
      for (let prevEnd = 0; prevEnd <= unmatchedWords.length; prevEnd++) {
        for (let currStart = prevEnd; currStart <= unmatchedWords.length; currStart++) {
          const prevDistance = !prevItem ? 0 : levenshtein.get(
            prevItem.text.split(' ').map(normalizeString).join(""),
            _.slice(
              recognizedWordList.map(word => word.text),
              _.head(prevItem.data.sentenceCandidate),
              _.last(prevItem.data.sentenceCandidate) + 1 + prevEnd).join("")
          );
          const currDistance = levenshtein.get(
            currItem.text.split(' ').map(normalizeString).join(""),
            _.slice(
              recognizedWordList.map(word => word.text),
              _.head(currItem.data.sentenceCandidate) - unmatchedWords.length + currStart,
              _.last(currItem.data.sentenceCandidate) + 1).join("")
          );

          if (minDistance > prevDistance + currDistance) {
            minDistance = prevDistance + currDistance;
            minIndex = { prevEnd, currStart };
          }
        }
      }

      const { prevEnd, currStart } = minIndex;
      const ret = [];
      if (prevEnd > 0) {
        ret.push({
          id: newSubtitle[i-1].id,
          type: "prev",
          words: unmatchedWords.slice(0, prevEnd)
        })
      }
      if (currStart < unmatchedWords.length) {
        ret.push({
          id,
          type: "curr",
          words: unmatchedWords.slice(currStart)
        })
      }
      return ret;
    }))
      .forEach(update => {
        const { id, type, words } = update;
        if (type === "prev") {
          newSubtitle[id-1].endTime = convertSecondsToFormat(_.last(words).endTime);
          newSubtitle[id-1].data.sentenceCandidate = newSubtitle[id-1].data.sentenceCandidate.concat(words.map(word => word.id - 1))
        } else if (type === "curr") {
          newSubtitle[id-1].startTime = convertSecondsToFormat(_.head(words).startTime);
          newSubtitle[id-1].data.sentenceCandidate = words.map(word => word.id-1).concat(newSubtitle[id - 1].data.sentenceCandidate)
        }
      });
    resolve(newSubtitle);
  });
};

module.exports = Combiner;
