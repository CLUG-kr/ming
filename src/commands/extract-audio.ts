const ffmpeg = require('fluent-ffmpeg');
const tempfile = require('tempfile');

export const extractAudioCommand = (videoFilepath, options) => {
        if (!videoFilepath) return console.error('The video file is missing');
        let outputFilepath = options.outputFile || tempfile('.ogg');
        extractAudio(videoFilepath, outputFilepath)
                .then((audioFilepath) => {
                        console.log(audioFilepath);
                })
                .catch((err) => {
                        console.error('Error while extracting audio:', err);
                });
}

function extractAudio(videoFilepath, outputFilepath) {
        return new Promise((resolve, reject) => {
                ffmpeg(videoFilepath)
                        .output(outputFilepath)
                        .noVideo()
                        .audioCodec('libvorbis') // ogg
                        .audioChannels(2)
                        .audioFrequency(16000) // IBM Watson preferred settings.
                        .on('start', () => {
                                console.log('Extracting audio started');
                                console.time('extractAudio');
                        })
                        .on('error', (err) => {
                                reject(err);
                        })
                        .on('end', () => {
                                console.log('Extracing audio is done');
                                console.timeEnd('extractAudio');
                                resolve(outputFilepath);
                        })
                        .run();
        });
}
