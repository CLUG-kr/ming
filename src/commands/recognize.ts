import * as fs from "fs";

import { SpeechToTextV1 } from "watson-developer-cloud";

const tempfile = require('tempfile');

export const recognizeCommand = (audioFilepath, options) => {
        console.time('recognize');
        recognize(audioFilepath)
                .then((outputFilepath) => {
                        console.log('recognize done:', outputFilepath);
                        console.timeEnd('recognize');
                })
                .catch((err) => {
                        console.error('Error while recognizing audio:', err);
                });
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
