import * as _ from "lodash";

import { Match, MatchContext } from "./data/Match";
import { RecognitionResult, RecognitionResultWord } from "./data/RecognitionResult";
import { convertSecondsToFormat, normalizeString } from "./utils";

import { Subtitle } from "./data/Subtitle";
import { findPieceInRecognition } from "./core/matcher";

const levenshtein = require('fast-levenshtein');

function findLIS (candidates: Match[]): Match[] {
        candidates = _.sortBy(candidates, [(candidate: Match) => candidate.endTime]);
        let lisTable = _.times(candidates.length, _.constant(0));
        for (let i = 0; i < candidates.length; i++) {
                const max = candidates
                        .map((candidate, index) => {
                                const { startTime, endTime, piece } = candidate;
                                return { startTime, endTime, piece, index };
                        })
                        .filter((candidate) => {
                                const { startTime, endTime, piece: { id } } = candidate;
                                return endTime <= candidates[i].startTime && id < candidates[i].piece.id;
                        })
                        .map((candidate) => lisTable[candidate.index])
                        .reduce((a, b) => a > b ? a : b, 0);
                lisTable[i] = max + 1;
        }
        // FIXME: It is possible there are not unique LIS result
        let nextSequenceLength: number = _.reduce(lisTable, (a, b) => _.max([a, b]));
        let lastPieceId = 987654321;
        let lastStartTime = 987654321;
        let lis = [];
        for (let i = candidates.length - 1; i >= 0; i--) {
                if (lisTable[i] !== nextSequenceLength)
                        continue;
                else if (candidates[i].piece.id >= lastPieceId)
                        continue;
                else if (candidates[i].endTime > lastStartTime)
                        continue;
                nextSequenceLength--;
                lastPieceId = candidates[i].piece.id;
                lastStartTime = candidates[i].startTime;
                lis.push(candidates[i]);
        }
        return lis.reverse();
}

export const combine = (subtitle: Subtitle, recognitionResult: RecognitionResult) => {
        return new Promise((resolve, reject) => {
                const recognizedWordList = recognitionResult.words;
                const recognizedWordPositions = recognitionResult.wordPositionsMap;
                const matchContext = {
                        words: recognizedWordList,
                        positions: recognizedWordPositions
                };

                const candidates = _.flatten(_.map(subtitle.pieces, (piece, index) => {
                        const matchCandidates = findPieceInRecognition(matchContext, piece);
                        piece.setMatches(matchCandidates);
                        return matchCandidates;
                }));

                const lis = findLIS(candidates);
                lis.forEach(match => {
                        match.piece.setMatch(match);
                });
                const newSubtitle = Subtitle.fromLIS(lis, subtitle);
                resolve(newSubtitle);
        });
};

export const interpolateMissingWords = (newSubtitle: Subtitle, subtitle: Subtitle, recognitionResult: RecognitionResult) => {
        return new Promise((resolve, reject) => {
                const recognizedWordList = recognitionResult.words;

                let expectWordPosition = 0;
                let expectOriginalId = 0;
                const interpolations = _.flatten(newSubtitle.pieces.map((piece, i) => {
                        const { id, text, startTime, endTime, match } = piece;
                        const originalId = match.piece.id;

                        const unmatchedPieces = _.slice(subtitle.pieces, expectOriginalId, originalId - 1);
                        expectOriginalId = originalId;

                        const unmatchedWords = _.slice(recognizedWordList, expectWordPosition, _.head(match.positions));
                        expectWordPosition = (_.last(match.positions) as number) + 1;

                        if (process.env.NODE_ENV === "DEBUG" && unmatchedPieces.length + unmatchedWords.length > 0) {
                                console.log(`ID: ${id}`);
                                if (unmatchedPieces.length > 0) {
                                        console.log('    PIECE', unmatchedPieces.map((piece: any) => piece.text));
                                }
                                if (unmatchedWords.length > 0) {
                                        console.log('    WORD', unmatchedWords.map((word: any) => word.text));
                                }
                        }

                        const prevItem = newSubtitle.pieces[i - 1];
                        const currItem = piece;

                        if (unmatchedWords.length === 0) return [];

                        let minDistance = 987654321;
                        let minIndex = { prevEnd: -1, currStart: -1 };
                        for (let prevEnd = 0; prevEnd <= unmatchedWords.length; prevEnd++) {
                                for (let currStart = prevEnd; currStart <= unmatchedWords.length; currStart++) {
                                        const prevDistance = !prevItem ? 0 : levenshtein.get(
                                                prevItem.textLevenshtein,
                                                _.slice(
                                                        recognizedWordList.map(word => word.text),
                                                        _.head(prevItem.match.positions),
                                                        _.last(prevItem.match.positions) + 1 + prevEnd).join("")
                                        );
                                        const currDistance = levenshtein.get(
                                                currItem.textLevenshtein,
                                                _.slice(
                                                        recognizedWordList.map(word => word.text),
                                                        _.head(currItem.match.positions) - unmatchedWords.length + currStart,
                                                        _.last(currItem.match.positions) + 1).join("")
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
                                        id: newSubtitle.pieces[i - 1].id,
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

                interpolations.forEach((update: any) => {
                        const { id, type, words } = update;
                        if (type === "prev") {
                                newSubtitle.pieces[id - 1].endTime = convertSecondsToFormat((_.last(words) as any).endTime);
                                newSubtitle.pieces[id - 1].match.positions = newSubtitle.pieces[id - 1].match.positions.concat(words.map(word => word.id - 1))
                        } else if (type === "curr") {
                                newSubtitle.pieces[id - 1].startTime = convertSecondsToFormat((_.head(words) as any).startTime);
                                newSubtitle.pieces[id - 1].match.positions = words.map(word => word.id - 1).concat(newSubtitle.pieces[id - 1].match.positions)
                        }
                });
                resolve(newSubtitle);
        });
};
