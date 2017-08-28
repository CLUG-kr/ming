import * as _ from "lodash";

import { Match } from "../data/Match";

interface Sieve {
        (matches: Match[]): Match[];
}

export const LISSieve = (candidates: Match[]) => {
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
        let lis: Match[] = [];
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
        // FIXME: setMatch => setSieveHint
        lis.forEach(match => match.piece.setMatch(match));
        return lis.reverse();
}

