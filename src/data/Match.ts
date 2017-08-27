import * as _ from "lodash";

import { RecognitionResultWord, RecognitionResultWordPositionsMap } from "./RecognitionResult";

export interface MatchContext {
        words: RecognitionResultWord[];
        positions: RecognitionResultWordPositionsMap;
}

export class Match {
        context: MatchContext;
        positions: number[];

        constructor(context: MatchContext, positions: number[]) {
                this.context = context;
                this.positions = positions.slice();
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
}
