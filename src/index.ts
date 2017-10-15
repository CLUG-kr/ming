import * as fs from "fs";

import { combineCommand } from "./commands/combine";
import { extractAudioCommand } from "./commands/extract-audio";
import { recognizeCommand } from "./commands/recognize";
import { shiftCommand } from "./commands/shift";
import { statRecognitionCommand } from "./commands/stat-recognition";
import { statSubtitleCommand } from "./commands/stat-subtitle";
import { testCommand } from "./commands/test";

const program = require('commander');

program.version('0.0.1');

program
        .command('extract-audio [video]')
        .description('Extract audio from video using ffmpeg')
        .option('-o, --output-file [filepath]', 'Save a audio file to given path')
        .action(extractAudioCommand);

program
        .command('recognize [audio]')
        .description('Convert audio to text using IBM Watson Speech-to-text API')
        .option('-o, --output-file [filepath]', 'Save a dump of recognition result to given path')
        .action(recognizeCommand);

program
        .command('combine [subtitle] [recognition_result]')
        .description('Generate fixed subtitle using recognition result and misaligned subtitle')
        .option('-o, --output-file [filepath]', 'Save a new subtitle to given path')
        .option('-d, --debug-html', 'Save a html file that contains debug infomations')
        .action(combineCommand);

program
        .command('stat-subtitle [subtitle]')
        .action(statSubtitleCommand);

program
        .command('stat-recognition [recognition_result]')
        .action(statRecognitionCommand);

program
        .command('shift')
        .option('-s, --seconds [seconds]')
        .option('-i, --input-file [input_filepath]')
        .option('-o, --output-file [output_filepath]')
        .action(shiftCommand);

program
        .command('test [test_id] [...args]')
        .action(testCommand);

program
        .command('*')
        .action(() => {
                program.outputHelp();
        });

if (process.argv.slice(2).length) {
        program.parse(process.argv);
} else {
        program.outputHelp();
}
