import * as _ from "lodash";

import { ComputedSubtitlePiece } from "../data/ComputedSubtitlePiece";
import { RecognitionResult } from "../data/RecognitionResult";
import { SubtitlePiece } from "../data/SubtitlePiece";

export interface Matcher {
        (recognitionResult: RecognitionResult, piece: SubtitlePiece, positionRangeBegin?: number, positionRangeEnd?: number): ComputedSubtitlePiece[];
}

const findCandidatesByRecursion = (items, i: number, context: number[], cb: (itemPositions: number[]) => void) => {
        context.push(i);
        cb(_.clone(context));
        items[i].next.forEach(j => {
                findCandidatesByRecursion(items, j, context, cb);
        });
        context.pop();
};

function filterLCS (candidatePositions: number[][]): number[][] {
        const maxLength = _.max(candidatePositions.map(positions => positions.length));
        return _.filter(candidatePositions, positions => positions.length === maxLength);
}

export const LCSMatcher: Matcher = (recognitionResult: RecognitionResult, piece: SubtitlePiece, positionRangeBegin?: number, positionRangeEnd?: number) => {
        const items = _.sortBy(
                _.flatten(piece.normalizedWords
                        .map((word, positionInPiece) => {
                                const wordPositions = recognitionResult.wordPositionsMap[word] || [];
                                return wordPositions.filter(position => {
                                        const positionStart = positionRangeBegin || 0;
                                        const positionEnd = positionRangeEnd || recognitionResult.words.length;
                                        return position >= positionStart && position < positionEnd;
                                }).map(positionInRecognition => ({
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
                while (items.length > i + 1 && items[i + 1].positionInRecognition <= offsetBound) {
                        i++;
                        const diffPositionInPiece = items[i].positionInPiece - item.positionInPiece;
                        const diffPositionInRecognition = items[i].positionInRecognition - item.positionInRecognition;
                        if (diffPositionInRecognition > 0 && diffPositionInPiece > 0 && diffPositionInRecognition <= diffPositionInPiece * 2) {
                                item.next.push(i);
                        }
                }
                // console.log(`item=${JSON.stringify(item)} remaining=${remainingWordCountInPiece} until=${offsetBound}`);
        });

        const candidates: number[][] = [];
        for (let i = 0; i < items.length; i++) {
                findCandidatesByRecursion(items, i, [], (itemPositions: number[]) => {
                        const positionsInRecognition = itemPositions.map(pos => items[pos].positionInRecognition);
                        candidates.push(positionsInRecognition);
                });
        }
        const ret = filterLCS(candidates).map(positions => new ComputedSubtitlePiece(piece, recognitionResult, positions));
        return (_.takeRight(_.sortBy(ret, candidate => candidate.positions.length), 20)) || [];
};
