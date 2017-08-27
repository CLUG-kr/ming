import * as _ from "lodash";
import * as assert from "assert";
import * as fs from "fs";

const subtitlesParser = require('subtitles-parser');

const { convertFormatToSeconds } = require('../utils');

const getJaccardIndexInternal = (a, b) => {
        assert(typeof a.start === 'number');
        assert(typeof a.end === 'number');
        assert(a.start < a.end);
        assert(typeof b.start === 'number');
        assert(typeof b.end === 'number');
        assert(b.start < b.end);

        const intersection = _.max([0, _.min([a.end, b.end]) - _.max([a.start, b.start])]);
        const union = (a.end - a.start) + (b.end - b.start) - intersection;

        return intersection / union;
};

const mean = array => _.round(_.mean(array), 2);
const zeros = n => _.fill(_.range(n), 0);

const getJaccardIndex = (a, b) => {
        const aSeconds = {
                start: convertFormatToSeconds(a.startTime),
                end: convertFormatToSeconds(a.endTime),
        };
        const bSeconds = {
                start: convertFormatToSeconds(b.startTime),
                end: convertFormatToSeconds(b.endTime),
        }
        return getJaccardIndexInternal(aSeconds, bSeconds);
};

export const accuracyCommand = (outputFilepath, groundTruthFilepath, options) => {
        if (!outputFilepath) return console.error('The output subtitle file must be given');
        if (!groundTruthFilepath) return console.error('The ground truth subtitle file must be given');

        const output = subtitlesParser.fromSrt(fs.readFileSync(outputFilepath, 'utf-8'));
        const groundTruth = subtitlesParser.fromSrt(fs.readFileSync(groundTruthFilepath, 'utf-8'));

        let accuracies = [];
        let from = 0;
        output.forEach((outputItem) => {
                const index = _.findIndex(groundTruth, item => item.text === outputItem.text, from);
                from = index + 1;
                accuracies.push(getJaccardIndex(outputItem, groundTruth[index]));
        });

        // FIXME: not tested
        if (!options.withoutMissings) {
                const missingCount = groundTruth.length - output.length;
                accuracies = _.concat(accuracies, zeros(missingCount));
        }

        // FIXME: not tested
        if (options.printAll) {
                _.concat(accuracies, zeros(missingCount)).forEach((acc, index) => console.log(`${index} ${acc}`));
        }
        console.log(`mean ${mean(accuracies)}`);
};
