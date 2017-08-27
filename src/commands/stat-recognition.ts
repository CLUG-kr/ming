import * as _ from "lodash";

const RecognitionResult = require("../data/RecognitionResult");

const statRecognitionCommand = (recognitionFilepath, ...args) => {
        if (!recognitionFilepath) return console.error("The recognition result file must be given");
        const recognitionResult = RecognitionResult.fromJSON(recognitionFilepath);

        const wordList = recognitionResult.words();
        console.log(_.range(12800, 12829).map(i => wordList[i].text));
        console.log(wordList.length)
};

module.exports = statRecognitionCommand;
