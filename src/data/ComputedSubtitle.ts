import { Subtitle } from "./Subtitle";

export class ComputedSubtitle extends Subtitle {
        origin: Subtitle;

        constructor(pieces, origin) {
                super(pieces);

                this.origin = origin;
        }

        dumpDebugHtml() {
                // Not implemented;
        }
}
