import * as _ from "lodash";
import * as fs from "fs";

import { LCSMatcher } from "../core/matcher";
import { LISSieve } from "../core/sieve";
import { RecognitionResult } from "../data/RecognitionResult";
import { Subtitle } from "../data/Subtitle";
import { interpolateMissingWords } from "../combiner";

export const combineCommand = (subtitleFilepath, recognitionFilepath, options) => {
        if (!subtitleFilepath) return console.error('The subtitle file must be given');
        if (!recognitionFilepath) return console.error('The recognition result file must be given');

        const subtitle = Subtitle.fromSrt(subtitleFilepath);
        const recognitionResult = RecognitionResult.fromJSON(recognitionFilepath);

        const matcher = LCSMatcher;
        const sieve = LISSieve;

        const matchContext = {
                words: recognitionResult.words,
                positions: recognitionResult.wordPositionsMap
        };

        const candidates = _.flatten(_.map(subtitle.pieces, piece => matcher(matchContext, piece)));
        const lis = sieve(candidates);
        const newSubtitle = Subtitle.fromLIS(lis, subtitle);

        interpolateMissingWords(newSubtitle, subtitle, recognitionResult)
                .then((newSubtitle: Subtitle) => {
                        const text = newSubtitle.pieces
                                .map((item) => {
                                        const { id, text, startTime, endTime } = item;
                                        return `${id}\n${startTime} --> ${endTime}\n${text}\n`
                                })
                                .join("\n");
                        if (options.outputFile) {
                                fs.writeFileSync(options.outputFile, text);
                        } else {
                                if (process.env.NODE_ENV !== "DEBUG") {
                                        console.log(text);
                                }
                        }
                })
                .catch((err) => {
                        console.error('Error while combining subtitle and recognition result:', err);
                });
}
