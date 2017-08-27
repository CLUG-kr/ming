const striptags = require('striptags');

import { convertFormatToSeconds, convertSecondsToFormat, normalizeString } from "../utils";

export class SubtitlePiece {
    id: any;
    _startTime: any;
    startTime: any;
    endTime: any;
    text: any;
    data: any;

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
        return striptags(this.text).split(/\s+/);
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
