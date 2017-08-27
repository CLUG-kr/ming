import * as _ from "lodash";

class Match {
        context: any;
        positions: any;

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
