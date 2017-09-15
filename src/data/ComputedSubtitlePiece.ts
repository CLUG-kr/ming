import * as _ from "lodash";

import { RecognitionResult } from "./RecognitionResult";
import { SubtitlePiece } from "./SubtitlePiece";
import { convertSecondsToFormat } from "../utils";
import { getJaccardIndex } from "../commands/accuracy";

export class ComputedSubtitlePiece extends SubtitlePiece {
        recognitionResult: RecognitionResult;
        origin: SubtitlePiece;
        positions: number[];

        constructor(origin: SubtitlePiece, recognitionResult: RecognitionResult, positions: number[]) {
                const startTime = convertSecondsToFormat(recognitionResult.words[_.head(positions)].startTime);
                const endTime = convertSecondsToFormat(recognitionResult.words[_.last(positions)].endTime);
                super({ id: null, startTime, endTime, text: origin.text });

                this.origin = origin;
                this.recognitionResult = recognitionResult;
                this.positions = positions;
        }

        wordsInPositions() {
                return _.slice(this.recognitionResult.words, _.head(this.positions), _.last(this.positions) + 1);
        }

        getJaccardIndex() {
                // FIXME: only supported the origin is Subtitle
                return getJaccardIndex(this, this.origin);
        }
}
