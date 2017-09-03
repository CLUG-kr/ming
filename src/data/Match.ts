import * as _ from "lodash";

import { RecognitionResultWord, RecognitionResultWordPositionsMap } from "./RecognitionResult";

import { SubtitlePiece } from "./SubtitlePiece";

export interface MatchContext {
        words: RecognitionResultWord[];
        positions: RecognitionResultWordPositionsMap;
        positionStart?: number;
        positionEnd?: number;
}

export class Match {
        context: MatchContext;
        positions: number[];
        piece: SubtitlePiece;

        constructor(context: MatchContext, positions: number[], piece: SubtitlePiece) {
                this.context = context;
                this.positions = positions.slice();
                this.piece = piece;
        }

        get startTime() {
                return this.firstWord.startTime;
        }

        get endTime() {
                return this.lastWord.endTime;
        }

        get firstWord() {
                return this.context.words[_.head(this.positions)];
        }

        get lastWord() {
                return this.context.words[_.last(this.positions)];
        }

        get length() {
                return this.positions.length;
        }

        get words() {
                return _.slice(this.context.words, _.head(this.positions), _.last(this.positions) + 1);
        }
}
