import * as _ from "lodash";
import * as fs from "fs";

import { convertSecondsToFormat, normalizeString } from "../utils";

import { ComputedSubtitlePiece } from "./ComputedSubtitlePiece";
import { LCSMatcher } from "../core/matcher";
import { LISSieve } from "../core/sieve";
import { Matcher } from './../core/matcher';
import { Readable } from "stream";
import { RecognitionResult } from "./RecognitionResult";
import { Sieve } from './../core/sieve';
import { Subtitle } from "./Subtitle";
import { SubtitlePiece } from "./SubtitlePiece";
import { getJaccardIndex } from "../commands/accuracy";

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

        interpolateMissingPieces(matcher: Matcher, sieve: Sieve) {
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

                        const candidates = _.flatten(_.map(took, id => matcher(this.recognitionResult, this.origin.pieces[id - 1], a, b)));
                        const replace = sieve(candidates);

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

        dumpDebugHtml(id?: string) {
                if (this.pieces.length === 0) {
                        console.warn("No pieces in the ComputedSubtitle, abort dumpDebugHtml");
                        return;
                }
                const stream = new Readable;
                const matchedOriginalIds = this.computedPieces.map(computedPiece => computedPiece.origin.id);
                const matchedPositions = _.flatten(this.computedPieces.map(computedPiece => computedPiece.positions));
                const matchedWordIds = matchedPositions.map(position => this.recognitionResult.words[position].id);
                const accuracies = this.computedPieces.map(piece => piece.getJaccardIndex());

                const renderTableRow = (columns: string[], isHeader: boolean = false) => {
                        const tds = columns.map(str => {
                                return `<${isHeader ? "th" : "td"}>${str}</${isHeader ? "th" : "td"}>`;
                        }).join("");
                        return `<tr>${tds}</tr>`;
                };
                const renderTableHeaderRow = (columns: string[]) => renderTableRow(columns, true);

                stream.push("<table>");
                stream.push("<thead>");
                stream.push(renderTableHeaderRow(["", "", `Average (exclude the missed): ${(_.sum(accuracies) / this.computedPieces.length).toFixed(2)}`]));
                stream.push(renderTableHeaderRow(["", "", `Average (include the missed): ${(_.sum(accuracies) / this.origin.pieces.length).toFixed(2)}`]));
                stream.push(renderTableHeaderRow(["Script", "Speech Recognition", "Jaccard Index"]));
                stream.push("</thead>");
                stream.push("<tbody>");


                const firstMatchHeadPosition = _.head(this.computedPieces[0].positions);
                if (firstMatchHeadPosition !== 0) {
                        // FIXME: Duplicated
                        const unmatchedWords = _.slice(this.recognitionResult.words, 0, firstMatchHeadPosition);
                        const recognitionColumn = `<span class="unmatched-words"> ${unmatchedWords.map(word => word.text).join(" ")}</span>`;
                        stream.push(renderTableRow(["", recognitionColumn, ""]));
                }

                this.origin.pieces.forEach(originPiece => {
                        const computedIndex = _.indexOf(matchedOriginalIds, originPiece.id);
                        const computedPiece = this.computedPieces[computedIndex];

                        const scriptColumn = `<span class="piece ${computedPiece ? "matched" : "missed"}">${originPiece.text}</span>`;
                        if (!computedPiece) {
                                stream.push(renderTableRow([scriptColumn, "", "0 (missed)"]));
                        } else {
                                const recognitionColumn = computedPiece.wordsInPositions().map(word => {
                                        const isWordMatched = _.indexOf(matchedWordIds, word.id) !== -1;
                                        return `<span class="word ${isWordMatched ? "matched" : "missed"}">${word.text} </span>`;
                                }).join("");
                                const jaccardIndexElemDebugString = `${computedPiece.startTime} --> ${computedPiece.endTime} (Computed)\\n${computedPiece.origin.startTime} --> ${computedPiece.origin.endTime} (Truth)`;
                                const jaccardIndexElemInnerText = computedPiece.getJaccardIndex().toFixed(3);
                                const jaccardIndexElem = `<button onclick="alert('${jaccardIndexElemDebugString}')">${jaccardIndexElemInnerText}</button>`
                                stream.push(renderTableRow([scriptColumn, recognitionColumn, `${jaccardIndexElem}`]));

                                const nextComputedPiece = this.computedPieces[computedIndex + 1];
                                const a = _.last(computedPiece.positions) + 1;
                                const b = nextComputedPiece
                                        ? _.head(nextComputedPiece.positions)
                                        : 987654321;
                                const unmatchedWords = _.slice(this.recognitionResult.words, a, b);
                                if (unmatchedWords.length > 0) {
                                        const unmatchedWordsElem = `<span class="unmatched-words"> ${unmatchedWords.map(word => word.text).join(" ")}</span>`;
                                        stream.push(renderTableRow(["", unmatchedWordsElem, ""]));
                                }
                        }
                });
                stream.push("</tbody>");
                stream.push("</table>");
                stream.push(`<link rel="stylesheet" type="text/css" href="styles.css">`);
                stream.push(null);
                const filepath = `debug/${moment().format("YYMMDD_HHmmss_SSS")}${id ? `_${id}` : ""}.html`;
                stream.pipe(fs.createWriteStream(filepath));
                console.log(`The debug file dumped: ${filepath}`);
        }
}
