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

        const computedSubtitle = new ComputedSubtitle([], recognitionResult);
        computedSubtitle.setOriginalSubtitle(subtitle);
        computedSubtitle.interpolateMissingPieces(LCSMatcher, LISSieve);

        if (debugHtml) {
                computedSubtitle.dumpDebugHtml("LCS_LIS");
        }
        computedSubtitle.interpolateMissingPieces(LCSMatcher, LISSieve);
        if (debugHtml) {
                computedSubtitle.dumpDebugHtml("AFTER_INTERPOLATE_PIECES_LCS_LIS");
        }
        computedSubtitle.interpolateMissingWords();
        if (debugHtml) {
                computedSubtitle.dumpDebugHtml("AFTER_INTERPOLATE_WORDS_LEVENSHTEIN");
        }
        computedSubtitle.toSrt().pipe(outputFile
                ? fs.createWriteStream(outputFile)
                : process.stdout);
}
