import * as _ from "lodash";
import * as assert from "assert";
import * as fs from "fs";

import { normalizeString } from "../utils";

interface TranscriptAlternativeTimestamp {
        0: string; // word
        1: number; // start time
        2: number; // end time
}

interface TranscriptAlternative {
        timestamps: TranscriptAlternativeTimestamp[];
}

interface Transcript {
        alternatives: TranscriptAlternative[];
}

interface IBMWatsonSpeechToTextJsonResult {
        results: Transcript[]
}

export interface RecognitionResultWord {
        id: number;
        text: string;
        startTime: number;
        endTime: number;
}

export interface RecognitionResultWordPositionsMap {
        [word: string]: number[];
}

export class RecognitionResult {
        words: RecognitionResultWord[];
        wordPositionsMap: RecognitionResultWordPositionsMap;

        static fromJSON(jsonFilepath) {
                if (!jsonFilepath) {
                        throw new Error("JSON filepath must be given");
                }
                const data = JSON.parse((fs.readFileSync(jsonFilepath, 'utf-8')));
                return new RecognitionResult(data);
        }

        constructor(data: IBMWatsonSpeechToTextJsonResult) {
                this.initializeWordList(data);
                this.initializeWordPositionsMap(this.words);
        }

        private initializeWordList = (data: IBMWatsonSpeechToTextJsonResult) => {
                // Assume the length of alternatives is 1. It depends on the recognition settings
                const allTimestamps = _.flatten(_.map(data.results, transcript => transcript.alternatives[0].timestamps));
                this.words = allTimestamps
                        .filter(item => !item[0].startsWith("%"))
                        .map((word, index) => ({
                                id: index + 1,
                                text: normalizeString(word[0]),
                                startTime: word[1],
                                endTime: word[2]
                        }));
        }

        private initializeWordPositionsMap = (words: RecognitionResultWord[]) => {
                const map = {};
                words.forEach((word, index) => {
                        if (!map[word.text])
                                map[word.text] = [];
                        map[word.text].push(index);
                });
                this.wordPositionsMap = map;
        }
}
