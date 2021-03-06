import * as _ from "lodash";
import * as fs from "fs";

import { Readable } from "stream";
import { SubtitlePiece } from "./SubtitlePiece";

const subtitlesParser = require('subtitles-parser');

export class Subtitle {
        pieces: SubtitlePiece[];

        static fromSrt(srtFilepath: string) {
                if (!srtFilepath) {
                        throw new Error("srtFilepath must be given");
                }
                const items = subtitlesParser.fromSrt(fs.readFileSync(srtFilepath, 'utf-8'));
                return new Subtitle(items.map(item => SubtitlePiece.fromSubtitlesParserItem(item)))
        }

        constructor(pieces: SubtitlePiece[]) {
                this.pieces = pieces;
        }

        get texts() {
                return this.pieces.map(piece => piece.text);
        }

        text(index: number) {
                return this.pieces[index].text;
        }

        piece(index: number) {
                return this.pieces[index];
        }

        toSrt() {
                const readable = new Readable;
                this.pieces.forEach((piece, i) => {
                        const { id, text, startTime, endTime } = piece;
                        readable.push(`${id}\n${startTime} --> ${endTime}\n${text}\n`);
                        if (piece !== _.last(this.pieces)) {
                                readable.push("\n");
                        }
                });
                readable.push(null);
                return readable;
        }

        shift(seconds: number) {
                this.pieces.forEach(piece => piece.shift(seconds));
        }
}
