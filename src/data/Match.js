const _ = require("lodash");

class Match {
    constructor(context, positions) {
        this.context = context;
        this.positions = positions.slice();
    }

    get firstWord() {
        return this.context.words[_.head(this.positions)];
    }

    get lastWord() {
        return this.context.words[_.last(this.positions)];
    }

    get length() {
        return this.positions.length;
    }
}

module.exports = Match;