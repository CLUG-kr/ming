let _ = require('lodash');
const levenshtein = require('fast-levenshtein');

const Subtitle = require('./data/Subtitle');
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

const findPieceInRecognition = (piece, recognizedWordPositions) => {
  let items = _.sortBy(
    _.flatten(piece.normalizedWords
      .map((word, positionInPiece) => {
        wordPositions = recognizedWordPositions[word] || [];
        return wordPositions.map(positionInRecognition => ({
          positionInPiece,
          positionInRecognition,
          word,
          next: []
        }));
      })
    ), item => item.positionInRecognition);

  items.forEach((item, i, items) => {
    const remainingWordCountInPiece = (piece.normalizedWords.length - 1 - item.positionInPiece);
    const offsetBound = item.positionInRecognition + remainingWordCountInPiece * 2;
    while (items.length > i+1 && items[i+1].positionInRecognition <= offsetBound) {
      i++;
      const diffPositionInPiece = items[i].positionInPiece - item.positionInPiece;
      const diffPositionInRecognition = items[i].positionInRecognition - item.positionInRecognition;
      if (diffPositionInPiece > 0 && diffPositionInRecognition <= diffPositionInPiece * 2) {
        item.next.push(i);
      }
    }
    if (process.env.NODE_ENV === "DEBUG") console.log(`item=${JSON.stringify(item)} remaining=${remainingWordCountInPiece} until=${offsetBound}`);
  });

  const candidates = [];
  for (let i = 0; i < items.length; i++) {
    findCandidatesByRecursion(items, i, [], (foundCandidate) => {
      candidates.push(foundCandidate.map(pos => items[pos].positionInRecognition));
    });
  }
  return (_.takeRight(_.sortBy(candidates, candidate => candidate.length), 20)) || [];
};

const dropUnlikelyCandidates = (matchCandidates) => {
  const maxLength = _.max(matchCandidates.map((candidate) => candidate.length));
  return _.filter(matchCandidates, (candidate) => candidate.length === maxLength);
}

const findLIS = (candidates) => {
  let lisTable = _.times(candidates.length, _.constant(0));
  for (let i = 0; i < candidates.length; i++) {
    const max = candidates
      .map((candidate, index) => {
        const { startTime, endTime, pieceId, data } = candidate;
        return { startTime, endTime, pieceId, index, data };
      })
      .filter((candidate) => {
        const { startTime, endTime, pieceId, index } = candidate;
        return endTime <= candidates[i].startTime && pieceId < candidates[i].pieceId;
      })
      .map((candidate) => lisTable[candidate.index])
      .reduce((a, b) => a > b ? a : b, 0);
    lisTable[i] = max + 1;
  }
  let nextSequenceLength = _.reduce(lisTable, (a, b) => _.max([a, b]));
  let lastSequenceId = 987654321;
  let lis = [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (lisTable[i] === nextSequenceLength && candidates[i].pieceId < lastSequenceId) {
      nextSequenceLength--;
      lastSequenceId = candidates[i].pieceId;
      lis.push(candidates[i]);
    }
  }
  return lis.reverse();
}

Combiner.combine = (subtitle, recognitionResult) => {
  return new Promise((resolve, reject) => {
    const recognizedWordList = getRecognizedWordList(recognitionResult);
    const recognizedWordPositions = getRecognizedWordPositions(recognizedWordList);

    let candidates = subtitle.pieces
      .map((piece, pieceId) => {
        let matchCandidates = findPieceInRecognition(piece, recognizedWordPositions);
        matchCandidates = dropUnlikelyCandidates(matchCandidates);
        return matchCandidates.map((matchCandidate) => {
          const firstWord = recognizedWordList[_.head(matchCandidate)];
          const lastWord = recognizedWordList[_.last(matchCandidate)];
          return {
            data: {
              matchCandidate: matchCandidate
            },
            startTime: firstWord.startTime,
            endTime: lastWord.endTime,
            pieceId
          };
        });
      })
      .reduce((a, b) => a.concat(b));

    candidates = _.sortBy(candidates, [(candidate) => candidate.endTime]);
    const lis = findLIS(candidates);
    const newSubtitle = Subtitle.fromLIS(lis, subtitle);

    // Interpolation
    let expectWordPosition = 0;
    let expectOriginalId = 1;
    const interpolations = _.flatten(newSubtitle.pieces.map((item, i) => {
      const { id, text, startTime, endTime, data: { originalId, matchCandidate } } = item;

      const unmatchedPieces = _.slice(subtitle, expectOriginalId - 1, originalId - 1)
      expectOriginalId = originalId + 1;

      const unmatchedWords = _.slice(recognizedWordList, expectWordPosition, _.head(matchCandidate));
      expectWordPosition = _.last(matchCandidate) + 1;

      if (process.env.NODE_ENV === "DEBUG" && unmatchedPieces.length + unmatchedWords.length > 0) {
        console.log(`ID: ${id}`);
        if (unmatchedPieces.length > 0) {
          console.log('    PIECE', unmatchedPieces.map(piece => piece.text));
        }
        if (unmatchedWords.length > 0) {
          console.log('    WORD', unmatchedWords.map(word => word.text));
        }
      }

      const prevItem = newSubtitle.pieces[i - 1];
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
              _.head(prevItem.data.matchCandidate),
              _.last(prevItem.data.matchCandidate) + 1 + prevEnd).join("")
          );
          const currDistance = levenshtein.get(
            currItem.text.split(' ').map(normalizeString).join(""),
            _.slice(
              recognizedWordList.map(word => word.text),
              _.head(currItem.data.matchCandidate) - unmatchedWords.length + currStart,
              _.last(currItem.data.matchCandidate) + 1).join("")
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
          id: newSubtitle.pieces[i-1].id,
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
    }));

    interpolations.forEach(update => {
        const { id, type, words } = update;
        if (type === "prev") {
          newSubtitle.pieces[id-1].endTime = convertSecondsToFormat(_.last(words).endTime);
          newSubtitle.pieces[id-1].data.matchCandidate = newSubtitle.pieces[id-1].data.matchCandidate.concat(words.map(word => word.id - 1))
        } else if (type === "curr") {
          newSubtitle.pieces[id-1].startTime = convertSecondsToFormat(_.head(words).startTime);
          newSubtitle.pieces[id-1].data.matchCandidate = words.map(word => word.id-1).concat(newSubtitle.pieces[id - 1].data.matchCandidate)
        }
      });
    resolve(newSubtitle);
  });
};

module.exports = Combiner;
