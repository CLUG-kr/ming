let program = require('commander');
let ffmpeg = require('fluent-ffmpeg');
let tempfile = require('tempfile');
let SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
let fs = require('fs');

program.version('0.0.1');

program
  .command('extract-audio [Video File]')
  .description('extract audio from video using ffmpeg')
  .option('-o, --output-file [Audio File]', 'Save a audio file to given path')
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
  .command('recognize [Audio file]')
  .description('Convert audio to text using IBM Watson Speech-to-text API')
  .option('-o, --output-file [Recognition Result File]', 'Save a dump of recognition result to given path')
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
  .command('combine [Subtitle File] [Recognition Result]')
  .description('Generate fixed subtitle using recognized text and wrong subtitle')
  .option('-o, --output-file [New Subtitle File]', 'Save a new subtitle to given path')
  .action((subtitleFilepath, recognitionFilepath) => {
    return console.error('Not implemented');
  });


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