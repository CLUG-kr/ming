const striptags = require('striptags');

const { convertFormatToSeconds, convertSecondsToFormat, normalizeString } = require('../utils');

class SubtitlePiece {
    static fromSubtitlesParserItem(item) {
        return new SubtitlePiece(item);
    }

    constructor({ id, startTime, endTime, text, data }) {
        if (!id) throw new Error();
        if (!startTime) throw new Error();
        if (!endTime) throw new Error();
        if (!text) throw new Error();

        this.id = id;
        this.startTime = typeof startTime === 'number' ? convertSecondsToFormat(startTime) : startTime;
        this.endTime = typeof endTime === 'number' ? convertSecondsToFormat(endTime) : endTime;
        this.text = text;
        this.data = data;
    }

    get words() {
        return striptags(this.text).split(' ');
    }

    get normalizedWords() {
        return this.words.map(normalizeString).filter(word => word.length > 0);
    }

    get startTimeS() {
        return convertFormatToSeconds(this._startTime);
    }

    get startTimeF() {
        return this._startTime;
    }

    get textLevenshtein() {
        return this.normalizedWords.join("");
    }
}

module.exports = SubtitlePiece;
