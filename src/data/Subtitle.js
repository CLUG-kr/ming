const fs = require('fs');
const subtitlesParser = require('subtitles-parser');

const SubtitlePiece = require('./SubtitlePiece');

class Subtitle {
    static fromSrt(srtFilepath) {
        if (!srtFilepath) {
            throw new Error("srtFilepath must be given");
        }
        const items = subtitlesParser.fromSrt(fs.readFileSync(srtFilepath, 'utf-8'));
        return new Subtitle(items.map(item => SubtitlePiece.fromSubtitlesParserItem(item)))
    }
    static fromLIS(list, originalSubtitle) {
        return new Subtitle(list.map((item, index) => {
            return new SubtitlePiece({
                id: index + 1,
                startTime: item.startTime,
                endTime: item.endTime,
                text: originalSubtitle.text(item.pieceId),
                data: {
                    originalId: item.pieceId + 1,
                    matchCandidate: item.data.matchCandidate
                }
            });
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
}

module.exports = Subtitle;
