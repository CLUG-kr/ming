import * as _ from "lodash";
import * as fs from "fs";

import { convertSecondsToFormat, normalizeString } from "../utils";

import { ComputedSubtitlePiece } from "./ComputedSubtitlePiece";
import { LCSMatcher } from "../core/matcher";
import { LISSieve } from "../core/sieve";
import { Readable } from "stream";
import { RecognitionResult } from "./RecognitionResult";
import { Subtitle } from "./Subtitle";
import { SubtitlePiece } from "./SubtitlePiece";

const moment = require("moment");
const levenshtein = require('fast-levenshtein');

export class ComputedSubtitle extends Subtitle {
        origin: Subtitle;
        recognitionResult: RecognitionResult;

        constructor(pieces: ComputedSubtitlePiece[], recognitionResult?: RecognitionResult) {
                super(pieces);
                // FIXME: What if recognitionResult is undefined?
                this.recognitionResult = recognitionResult || (pieces[0] && pieces[0].recognitionResult);
        }

        get computedPieces() {
                return this.pieces as ComputedSubtitlePiece[];
        }

        // NOTE: This is for debug or evaluation of the result
        setOriginalSubtitle(origin: Subtitle) {
                this.origin = origin;
        }

        private findComputedPieceByOriginPieceId(id: number): ComputedSubtitlePiece {
                return _.find(this.computedPieces, piece => piece.origin.id === id);
        }

        interpolateMissingPieces() {
                const unmatchedPieceIds = _.without(
                        this.origin.pieces.map(piece => piece.id),
                        ...this.computedPieces.map(piece => piece.origin.id));
                while (true) {
                        const took: number[] = _.takeWhile(unmatchedPieceIds, (() => {
                                let prev: null | number = null;
                                return (curr) => {
                                        if (prev === null || prev + 1 === curr) {
                                                prev = curr;
                                                return true;
                                        }
                                        return false;
                                };
                        })());
                        if (took.length === 0) break;
                        _.pullAll(unmatchedPieceIds, took);

                        // do somthing here
                        const prevComputed = this.findComputedPieceByOriginPieceId(_.head(took) - 1);
                        const nextComputed = this.findComputedPieceByOriginPieceId(_.last(took) + 1);
                        const a = prevComputed ? _.last(prevComputed.positions) + 1 : 0;
                        const b = nextComputed ? _.head(nextComputed.positions) : 987654321;
                        const words = _.slice(this.recognitionResult.words, a, b);
                        // console.log(words.map(word => word.text));

                        const candidates = _.flatten(_.map(took, id => LCSMatcher(this.recognitionResult, this.origin.pieces[id - 1], a, b)));
                        const replace = LISSieve(candidates);

                        if (replace.pieces.length === 0) {
                                continue;
                        }

                        const head = _.findIndex(this.pieces, prevComputed);
                        this.pieces = _.concat(_.takeWhile(this.pieces, piece => piece !== nextComputed), replace.pieces, _.takeRightWhile(this.pieces, piece => piece !== prevComputed));
                        this.pieces.forEach((piece, index) => {
                                piece.id = index + 1;
                        });
                }
        }

        interpolateMissingWords() {
                const recognizedWordList = this.recognitionResult.words;

                let expectWordPosition = 0;
                let expectOriginalId = 0;
                const interpolations = _.flatten(this.computedPieces.map((computedPiece, i) => {
                        const { id, text, startTime, endTime } = computedPiece;
                        const originalId = computedPiece.origin.id;

                        const unmatchedPieces = _.slice(this.origin.pieces, expectOriginalId, originalId - 1);
                        expectOriginalId = originalId;

                        const unmatchedWords = _.slice(recognizedWordList, expectWordPosition, _.head(computedPiece.positions));
                        expectWordPosition = _.last(computedPiece.positions) + 1;

                        if (process.env.NODE_ENV === "DEBUG" && unmatchedPieces.length + unmatchedWords.length > 0) {
                                console.log(`ID: ${id}`);
                                if (unmatchedPieces.length > 0) {
                                        console.log('    PIECE', unmatchedPieces.map(piece => piece.text));
                                }
                                if (unmatchedWords.length > 0) {
                                        console.log('    WORD', unmatchedWords.map(word => word.text));
                                }
                        }

                        const prevItem = this.computedPieces[i - 1];
                        const currItem = computedPiece;

                        if (unmatchedWords.length === 0) return [];

                        let minDistance = 987654321;
                        let minIndex = { prevEnd: -1, currStart: -1 };
                        for (let prevEnd = 0; prevEnd <= unmatchedWords.length; prevEnd++) {
                                for (let currStart = prevEnd; currStart <= unmatchedWords.length; currStart++) {
                                        const prevDistance = !prevItem ? 0 : levenshtein.get(
                                                prevItem.textLevenshtein,
                                                _.slice(
                                                        recognizedWordList.map(word => word.text),
                                                        _.head(prevItem.positions),
                                                        _.last(prevItem.positions) + 1 + prevEnd).join("")
                                        );
                                        const currDistance = levenshtein.get(
                                                currItem.textLevenshtein,
                                                _.slice(
                                                        recognizedWordList.map(word => word.text),
                                                        _.head(currItem.positions) - unmatchedWords.length + currStart,
                                                        _.last(currItem.positions) + 1).join("")
                                        );

                                        if (minDistance > prevDistance + currDistance) {
                                                minDistance = prevDistance + currDistance;
                                                minIndex = { prevEnd, currStart };
                                        }
                                }
                        }

                        const { prevEnd, currStart } = minIndex;
                        const ret = [];
                        if (prevEnd > 0) {
                                ret.push({
                                        id: this.pieces[i - 1].id,
                                        type: "prev",
                                        words: unmatchedWords.slice(0, prevEnd)
                                })
                        }
                        if (currStart < unmatchedWords.length) {
                                ret.push({
                                        id,
                                        type: "curr",
                                        words: unmatchedWords.slice(currStart)
                                })
                        }
                        return ret;
                }));

                interpolations.forEach((update: any) => {
                        const { id, type, words } = update;
                        if (type === "prev") {
                                this.computedPieces[id - 1].endTime = convertSecondsToFormat((_.last(words) as any).endTime);
                                this.computedPieces[id - 1].positions = this.computedPieces[id - 1].positions.concat(words.map(word => word.id - 1))
                        } else if (type === "curr") {
                                this.computedPieces[id - 1].startTime = convertSecondsToFormat((_.head(words) as any).startTime);
                                this.computedPieces[id - 1].positions = words.map(word => word.id - 1).concat(this.computedPieces[id - 1].positions)
                        }
                });

        }

        dumpDebugHtml() {
                if (this.pieces.length === 0) {
                        console.warn("No pieces in the ComputedSubtitle, abort dumpDebugHtml");
                        return;
                }
                const stream = new Readable;
                const matchedOriginalIds = this.computedPieces.map(computedPiece => computedPiece.origin.id);
                const matchedPositions = _.flatten(this.computedPieces.map(computedPiece => computedPiece.positions));
                const matchedWordIds = matchedPositions.map(position => this.recognitionResult.words[position].id);

                stream.push("<table>");
                stream.push("<thead><tr><th>Script</th><th>Speech Recognition</th></tr></thead>");
                stream.push("<tbody>");

                const firstMatchHeadPosition = _.head(this.computedPieces[0].positions);
                if (firstMatchHeadPosition !== 0) {
                        // FIXME: Duplicated
                        const unmatchedWords = _.slice(this.recognitionResult.words, 0, firstMatchHeadPosition);
                        stream.push("<tr><td></td><td>");
                        stream.push(`<div class="unmatched-words"> ${unmatchedWords.map(word => word.text).join(" ")}</div>`);
                        stream.push("</td></tr>");
                }

                this.origin.pieces.forEach(originPiece => {
                        stream.push("<tr>");
                        const computedIndex = _.indexOf(matchedOriginalIds, originPiece.id);
                        const computedPiece = computedIndex > -1 ? this.computedPieces[computedIndex] : null;
                        stream.push(`<td class="piece ${computedPiece ? "matched" : "missed"}">${originPiece.text}</td>`);
                        stream.push("<td>");
                        if (computedPiece) {
                                const words = computedPiece.wordsInPositions();
                                words.forEach(word => {
                                        const isWordMatched = _.indexOf(matchedWordIds, word.id) !== -1;
                                        stream.push(`<span class="word ${isWordMatched ? "matched" : "missed"}">${word.text} </span>`)
                                });
                                const nextComputedPiece = this.computedPieces[computedIndex + 1];

                                const a = _.last(computedPiece.positions) + 1;
                                const b = nextComputedPiece
                                        ? _.head(nextComputedPiece.positions)
                                        : 987654321;
                                const unmatchedWords = _.slice(this.recognitionResult.words, a, b);
                                if (unmatchedWords.length > 0) {
                                        // FIXME:
                                        stream.push(`</td></tr><tr><td></td><td>`);
                                        stream.push(`<div class="unmatched-words"> ${unmatchedWords.map(word => word.text).join(" ")}</div>`);
                                }
                        }
                        stream.push("</td>");
                        stream.push("</tr>");
                });
                stream.push("</tbody>");
                stream.push("</table>");
                stream.push(`<link rel="stylesheet" type="text/css" href="styles.css">`);
                stream.push(null);
                const filepath = `debug/${moment().format()}.html`;
                stream.pipe(fs.createWriteStream(filepath));
                console.log(`The debug file dumped: ${filepath}`);
        }
}
