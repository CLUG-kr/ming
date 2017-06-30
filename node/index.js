let program = require('commander');

program.version('0.0.1');

program
  .command('extract-audio [Video File]')
  .description('extract audio from video using ffmpeg')
  .option('-o, --output-file [Audio File]', 'Save a audio file to given path')
  .action((videoFilepath, options) => {
    return console.error('Not implemented', videoFilepath, options.outputFile);
  });

program
  .command('recognize [Audio file]')
  .description('Convert audio to text using IBM Watson Speech-to-text API')
  .option('-o, --output-file [Recognition Result File]', 'Save a dump of recognition result to given path')
  .action((audioFilepath, options) => {
    return console.error('Not implemented');
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
