import * as _ from "lodash";
import * as fs from "fs";

import { ComputedSubtitle } from "../data/ComputedSubtitle";
import { LCSMatcher } from "../core/matcher";
import { LISSieve } from "../core/sieve";
import { RecognitionResult } from "../data/RecognitionResult";
import { Subtitle } from "../data/Subtitle";
import { SubtitlePiece } from "../data/SubtitlePiece";

export const combineCommand = (subtitleFilepath, recognitionFilepath, options) => {
        if (!subtitleFilepath) return console.error('The subtitle file must be given');
        if (!recognitionFilepath) return console.error('The recognition result file must be given');
        const { outputFile, debugHtml } = options;

        const subtitle = Subtitle.fromSrt(subtitleFilepath);
        const recognitionResult = RecognitionResult.fromIbmBluemixJsonResult(recognitionFilepath);

        const matcher = LCSMatcher;
        const sieve = LISSieve;

        const computedSubtitlePieces = _.flatten(_.map(subtitle.pieces, piece => matcher(recognitionResult, piece)));
        const computedSubtitle = sieve(computedSubtitlePieces);
        computedSubtitle.setOriginalSubtitle(subtitle);

        if (debugHtml) {
                computedSubtitle.dumpDebugHtml();
        }
        computedSubtitle.interpolateMissingPieces();
        if (debugHtml) {
                computedSubtitle.dumpDebugHtml();
        }
        computedSubtitle.interpolateMissingWords();
        if (debugHtml) {
                computedSubtitle.dumpDebugHtml();
        }
        computedSubtitle.toSrt().pipe(outputFile
                ? fs.createWriteStream(outputFile)
                : process.stdout);
}
