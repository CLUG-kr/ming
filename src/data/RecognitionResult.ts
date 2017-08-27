const assert = require('assert');

import * as fs from "fs";

const { normalizeString } = require('../utils');

export class RecognitionResult {
    data: any;

    static fromJSON(jsonFilepath) {
        if (!jsonFilepath) {
            throw new Error("JSON filepath must be given");
        }
        const data = JSON.parse((fs.readFileSync(jsonFilepath, 'utf-8')));
        return new RecognitionResult(data);
    }

    constructor(data) {
        this.data = data;
    }

    words() {
        return this.data.results
          .map((transcript) => {
            assert(transcript.alternatives.length === 1); // IBM watson default setting. Disable it if needed.
            return transcript.alternatives[0].timestamps.map((timestamp) => {
              const { 0: text, 1: startTime, 2: endTime } = timestamp;
              return { text, startTime, endTime };
            })
          })
          .reduce((a, b) => a.concat(b))
          .filter((word) => !word.text.startsWith('%')) // Remove non-text units like "%HESITATION"
          .map((word, index) => {
            return {
              id: index+1,
              text: normalizeString(word.text),
              startTime: word.startTime,
              endTime: word.endTime
            };
          });
    }
}
