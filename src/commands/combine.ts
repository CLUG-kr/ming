import * as fs from "fs";

import { combine, interpolateMissingWords } from "../combiner";

import { RecognitionResult } from "../data/RecognitionResult";
import { Subtitle } from "../data/Subtitle";

export const combineCommand = (subtitleFilepath, recognitionFilepath, options) => {
        if (!subtitleFilepath) return console.error('The subtitle file must be given');
        if (!recognitionFilepath) return console.error('The recognition result file must be given');

        const subtitle = Subtitle.fromSrt(subtitleFilepath);
        const recognitionResult = RecognitionResult.fromJSON(recognitionFilepath);

        combine(subtitle, recognitionResult)
                .then((newSubtitle) => {
                        return interpolateMissingWords(newSubtitle, subtitle, recognitionResult);
                })
                .then((newSubtitle: any) => {
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