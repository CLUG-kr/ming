import * as _ from "lodash";

import { Match, MatchContext } from "../data/Match";

const findCandidatesByRecursion = (items, i, context, cb) => {
        context.push(i);
        cb(_.clone(context));
        items[i].next.forEach(j => {
                findCandidatesByRecursion(items, j, context, cb);
        });
        context.pop();
};

const dropUnlikelyCandidates = (matchCandidates) => {
        const maxLength = _.max(matchCandidates.map((candidate) => candidate.positions.length));
        return _.filter(matchCandidates, (candidate: any) => candidate.positions.length === maxLength);
}

export const findPieceInRecognition = (matchContext: MatchContext, piece) => {
        const items = _.sortBy(
                _.flatten(piece.normalizedWords
                        .map((word, positionInPiece) => {
                                const wordPositions = matchContext.positions[word] || [];
                                return wordPositions.map(positionInRecognition => ({
                                        positionInPiece,
                                        positionInRecognition,
                                        word,
                                        next: []
                                }));
                        })
                ), (item: any) => item.positionInRecognition);

        items.forEach((item, i, items) => {
                const remainingWordCountInPiece = (piece.normalizedWords.length - 1 - item.positionInPiece);
                const offsetBound = item.positionInRecognition + remainingWordCountInPiece * 2;
                while (items.length > i + 1 && items[i + 1].positionInRecognition <= offsetBound) {
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
                        const positionsInContext = foundCandidate.map(pos => items[pos].positionInRecognition);
                        const foundMatch = new Match(matchContext, positionsInContext)
                        candidates.push(foundMatch);
                });
        }
        const ret = dropUnlikelyCandidates(candidates);
        return (_.takeRight(_.sortBy(ret, candidate => candidate.positions.length), 20)) || [];
};
