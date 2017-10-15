import * as fs from "fs";

import { Subtitle } from "../data/Subtitle";

export const shiftCommand = (options) => {
        const { seconds, inputFile, outputFile } = options;
        if (!seconds || !inputFile) return console.log(`Options -s and -i are required`);

        const inputSubtitle = Subtitle.fromSrt(inputFile);

        inputSubtitle.shift(Number.parseFloat(seconds));
        inputSubtitle.toSrt().pipe(outputFile
                ? fs.createWriteStream(outputFile)
                : process.stdout);
}
