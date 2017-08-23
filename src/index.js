let program = require('commander');
let ffmpeg = require('fluent-ffmpeg');
let tempfile = require('tempfile');
let SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
let fs = require('fs');

let accuracyCommand = require('./commands/accuracy');
const testCommand = require('./commands/test');
const statSubtitleCommand = require('./commands/stat-subtitle');
const statRecognitionCommand = require('./commands/stat-recognition');
let combiner = require('./combiner');
const Subtitle = require('./data/Subtitle');
const RecognitionResult = require('./data/RecognitionResult');

program.version('0.0.1');

program
  .command('extract-audio [video]')
  .description('Extract audio from video using ffmpeg')
  .option('-o, --output-file [filepath]', 'Save a audio file to given path')
  .action((videoFilepath, options) => {
    if (!videoFilepath) return console.error('The video file is missing');
    let outputFilepath = options.outputFile || tempfile('.ogg');
    extractAudio(videoFilepath, outputFilepath)
      .then((audioFilepath) => {
        console.log('Extracing audio is done:', audioFilepath);
      })
      .catch((err) => {
        console.error('Error while extracting audio:', err);
      });
  });

program
  .command('recognize [audio]')
  .description('Convert audio to text using IBM Watson Speech-to-text API')
  .option('-o, --output-file [filepath]', 'Save a dump of recognition result to given path')
  .action((audioFilepath, options) => {
    recognize(audioFilepath)
      .then((outputFilepath) => {
        console.log('recognize done:', outputFilepath);
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

    combiner.combine(subtitle, recognitionResult)
      .then((newSubtitle) => {
        return combiner.interpolateMissingWords(newSubtitle, subtitle, recognitionResult);
      })
      .then((newSubtitle) => {
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

function extractAudio (videoFilepath, outputFilepath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoFilepath)
      .output(outputFilepath)
      .noVideo()
      .audioCodec('libvorbis') // ogg
      .audioChannels(2)
      .audioFrequency(16000) // IBM Watson preferred settings.
      .on('start', () => {
        console.log('Extracting audio started');
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(outputFilepath);
      })
      .run();
  });
}

function recognize (audioFilepath) {
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
