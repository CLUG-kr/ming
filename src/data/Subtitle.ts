import * as fs from "fs";

import { Match } from "./Match";
import { SubtitlePiece } from "./SubtitlePiece";

const subtitlesParser = require('subtitles-parser');

export class Subtitle {
        pieces: SubtitlePiece[];

        static fromSrt(srtFilepath) {
                if (!srtFilepath) {
                        throw new Error("srtFilepath must be given");
                }
                const items = subtitlesParser.fromSrt(fs.readFileSync(srtFilepath, 'utf-8'));
                return new Subtitle(items.map(item => SubtitlePiece.fromSubtitlesParserItem(item)))
        }
        static fromLIS(list: Match[], originalSubtitle: Subtitle) {
                // FIXME: create ComputedSubtitle/ComputedSubtitlePiece here
                return new Subtitle(list.map((item, index) => {
                        const piece = new SubtitlePiece({
                                id: index + 1,
                                startTime: item.startTime,
                                endTime: item.endTime,
                                text: originalSubtitle.text(item.piece.id - 1)
                        });
                        piece.setMatches(item.piece.matches);
                        piece.setMatch(item.piece.match);
                        return piece;
                }));
        }

        constructor(pieces) {
                this.pieces = pieces;
        }

        get texts() {
                return this.pieces.map(piece => piece.text);
        }

        text(index) {
                return this.pieces[index].text;
        }

        piece(index) {
                return this.pieces[index];
        }
}
