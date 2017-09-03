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
        const recognitionResult = RecognitionResult.fromJSON(recognitionFilepath);

        const matcher = LCSMatcher;
        const sieve = LISSieve;

        const matchContext = {
                words: recognitionResult.words,
                positions: recognitionResult.wordPositionsMap
        };

        const candidates = _.flatten(_.map(subtitle.pieces, piece => matcher(matchContext, piece)));
        const lis = sieve(candidates);
        // FIXME:
        const computedPieces = lis.map((item, index) => {
                const piece = new SubtitlePiece({
                        id: index + 1,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        text: subtitle.text(item.piece.id - 1)
                });
                piece.setMatches(item.piece.matches);
                piece.setMatch(item.piece.match);
                return piece;
        })
        const computedSubtitle = new ComputedSubtitle(computedPieces, subtitle, recognitionResult);
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
