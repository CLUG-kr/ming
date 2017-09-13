import { convertFormatToSeconds, convertSecondsToFormat, normalizeString } from "../utils";

import { Match } from "./Match";

const striptags = require('striptags');

export class SubtitlePiece {
        // id is 1-based.
        id: number;
        startTime: string;
        endTime: string;
        text: string;

        // Computed feature
        match?: Match;

        static fromSubtitlesParserItem(item) {
                return new SubtitlePiece(item);
        }

        constructor({ id, startTime, endTime, text }) {
                if (!startTime) throw new Error();
                if (!endTime) throw new Error();
                if (!text) throw new Error();

                this.id = typeof id === "string" ? Number.parseInt(id) : id;
                this.startTime = typeof startTime === 'number' ? convertSecondsToFormat(startTime) : startTime;
                this.endTime = typeof endTime === 'number' ? convertSecondsToFormat(endTime) : endTime;
                this.text = text;
        }

        setMatch(match: Match) {
                this.match = match;
        }

        get words(): string[] {
                return striptags(this.text).split(/\s+/);
        }

        get normalizedWords(): string[] {
                return this.words.map(normalizeString).filter(word => word.length > 0);
        }

        get startTimeS(): number {
                return convertFormatToSeconds(this.startTime);
        }

        get endTimeS(): number {
                return convertFormatToSeconds(this.endTime);
        }

        get startTimeF(): string {
                return this.startTime;
        }

        get textLevenshtein(): string {
                return this.normalizedWords.join("");
        }
}
