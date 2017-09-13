import * as _ from "lodash";

import { ComputedSubtitle } from "../data/ComputedSubtitle";
import { ComputedSubtitlePiece } from "../data/ComputedSubtitlePiece";

export interface Sieve {
        (matches: ComputedSubtitlePiece[]): ComputedSubtitle;
}

export const LISSieve: Sieve = (candidates: ComputedSubtitlePiece[]) => {
        candidates = _.sortBy(candidates, [(candidate: ComputedSubtitlePiece) => candidate.endTime]);
        let lisTable = _.times(candidates.length, _.constant(0));
        for (let i = 0; i < candidates.length; i++) {
                const max = candidates
                        .map((candidate, index) => {
                                const { startTime, endTime, origin: piece } = candidate;
                                return { startTime, endTime, piece, index };
                        })
                        .filter((candidate) => {
                                const { startTime, endTime, piece: { id } } = candidate;
                                return endTime <= candidates[i].startTime && id < candidates[i].origin.id;
                        })
                        .map((candidate) => lisTable[candidate.index])
                        .reduce((a, b) => a > b ? a : b, 0);
                lisTable[i] = max + 1;
        }
        // FIXME: It is possible there are not unique LIS result
        let nextSequenceLength: number = _.reduce(lisTable, (a, b) => _.max([a, b]));
        let lastPieceId = 987654321;
        let lastStartTime = 987654321;
        let lis: ComputedSubtitlePiece[] = [];
        for (let i = candidates.length - 1; i >= 0; i--) {
                if (lisTable[i] !== nextSequenceLength)
                        continue;
                else if (candidates[i].origin.id >= lastPieceId)
                        continue;
                else if (candidates[i].endTimeS > lastStartTime)
                        continue;
                nextSequenceLength--;
                lastPieceId = candidates[i].origin.id;
                lastStartTime = candidates[i].startTimeS;
                lis.push(candidates[i]);
        }
        return new ComputedSubtitle(lis.reverse());
}

