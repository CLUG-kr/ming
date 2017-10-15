import * as _ from "lodash";
import * as assert from "assert";

import { Subtitle } from "../data/Subtitle";
import { SubtitlePiece } from "../data/SubtitlePiece";
import { getJaccardIndex } from "./accuracy";

export const jaccardIndexCommand = (options) => {
        const { subtitle_a, subtitle_b } = options;
        if (!subtitle_a || !subtitle_b)
                return console.error("The option -a and -b are missing.");

        const subtitleA = Subtitle.fromSrt(subtitle_a);
        const subtitleB = Subtitle.fromSrt(subtitle_b);

        let originalPieces: SubtitlePiece[];
        let computedPieces: SubtitlePiece[];

        // Assume the computed pieces is the subset of the original pieces.
        if (subtitleA.pieces.length >= subtitleB.pieces.length) {
                originalPieces = subtitleA.pieces;
                computedPieces = subtitleB.pieces;
        } else {
                originalPieces = subtitleB.pieces;
                computedPieces = subtitleA.pieces;
        }

        const indexes: number[] = [];
        let missings = 0;
        let from = 0;
        originalPieces.forEach(original => {
                const position = _.findIndex(computedPieces, computed => computed.text === original.text, from)
                if (position === -1) {
                        missings++;
                        return;
                }
                from = position;
                const jaccardIndex = getJaccardIndex(original, computedPieces[position]);
                indexes.push(jaccardIndex);
        });

        console.log(_.mean(indexes));
};
