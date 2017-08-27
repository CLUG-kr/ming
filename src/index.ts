import * as fs from "fs";

import { combine, interpolateMissingWords } from "./combiner";

import { RecognitionResult } from "./data/RecognitionResult";
import { Subtitle } from "./data/Subtitle";
import { accuracyCommand } from "./commands/accuracy";
import { extractAudioCommand } from "./commands/extract-audio";
import { statRecognitionCommand } from "./commands/stat-recognition";
import { statSubtitleCommand } from "./commands/stat-subtitle";
import { testCommand } from "./commands/test";

const program = require('commander');
const tempfile = require('tempfile');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');

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
        .action((audioFilepath, options) => {
                console.time('recognize');
                recognize(audioFilepath)
                        .then((outputFilepath) => {
                                console.log('recognize done:', outputFilepath);
                                console.timeEnd('recognize');
                        })
                        .catch((err) => {
                                console.error('Error while recognizing audio:', err);
                        });
        });

program
        .command('combine [subtitle] [recognition_result]')
        .description('Generate fixed subtitle using recognition result and misaligned subtitle')
        .option('-o, --output-file [filepath]', 'Save a new subtitle to given path')
        .action((subtitleFilepath, recognitionFilepath, options) => {
                if (!subtitleFilepath) return console.error('The subtitle file must be given');
                if (!recognitionFilepath) return console.error('The recognition result file must be given');

                const subtitle = Subtitle.fromSrt(subtitleFilepath);
                const recognitionResult = RecognitionResult.fromJSON(recognitionFilepath);

                combine(subtitle, recognitionResult)
                        .then((newSubtitle) => {
                                return interpolateMissingWords(newSubtitle, subtitle, recognitionResult);
                        })
                        .then((newSubtitle: any) => {
                                const text = newSubtitle.pieces
                                        .map((item) => {
                                                const { id, text, startTime, endTime } = item;
                                                return `${id}\n${startTime} --> ${endTime}\n${text}\n`
                                        })
                                        .join("\n");
                                if (options.outputFile) {
                                        fs.writeFileSync(options.outputFile, text);
                                } else {
                                        if (process.env.NODE_ENV !== "DEBUG") {
                                                console.log(text);
                                        }
                                }
                        })
                        .catch((err) => {
                                console.error('Error while combining subtitle and recognition result:', err);
                        });
        });

program
        .command('accuracy [generated] [ground_truth]')
        .description('Compute accuracy (currently, Jaccard Index)')
        .action(accuracyCommand);

program
        .command('stat-subtitle [subtitle]')
        .action(statSubtitleCommand);

program
        .command('stat-recognition [recognition_result]')
        .action(statRecognitionCommand);

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

function recognize(audioFilepath) {
        return new Promise((resolve, reject) => {
                let service = new SpeechToTextV1({
                        username: process.env.SERVICE_NAME_USERNAME,
                        password: process.env.SERVICE_NAME_PASSWORD
                });
                const params = {
                        audio: fs.createReadStream(audioFilepath),
                        content_type: 'audio/ogg; rate=16000',
                        inactivity_timeout: -1,
                        timestamps: true
                };
                service.recognize(params, (err, res) => {
                        if (err) return reject(err);
                        let out = tempfile();
                        fs.writeFile(out, JSON.stringify(res), (err) => {
                                if (err) return reject(err);
                                resolve(out);
                        });
                });
        });
}
