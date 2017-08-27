const _ = require("lodash");

const Subtitle = require("../data/Subtitle");

const statSubtitleCommand = (subtitleFilepath, ...args) => {
        if (!subtitleFilepath) return console.error("The subtitle file must be given");
        const subtitle = Subtitle.fromSrt(subtitleFilepath);

        _.range(10).forEach(i => {
                console.log(`${subtitle.text(i)} ///// ${subtitle.piece(i).normalizedWords}`);
        });

        let count = 0;
        subtitle.pieces.forEach(piece => {
                count += piece.words.length;
        });

        console.log(count);
};

module.exports = statSubtitleCommand;
