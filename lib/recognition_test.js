"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = require('./../config/mixidea.conf');
class RecognitionTest {
    constructor() { }
    test() {
        const gcsUri = "gs://" + config.rawfile_bucketname + "/-KmpTyjtzGUvQ2fZVjza/NA_LO__1497697741984__1497697741988.raw";
        const Speech = require('@google-cloud/speech');
        const speech = Speech();
        const request = {
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 44100,
                languageCode: 'en-US',
                enableWordTimeOffsets: true
            },
            audio: {
                uri: gcsUri
            }
        };
        speech.longRunningRecognize(request)
            .then((results) => {
            const operation = results[0];
            return operation.promise();
        })
            .then((results) => {
            console.dir("transcription results,results", JSON.stringify(results, null, 2));
            if (results && results[0] && results[0].results && results[0].results[0] && results[0].results[0].alternatives) {
                const all_transcript = results[0].results;
                console.log(all_transcript);
                const transcript = results[0].results[0].alternatives[0];
                console.log(transcript);
            }
        }).catch((err) => {
            console.log("speech recognition failed", err);
        });
    }
}
exports.RecognitionTest = RecognitionTest;
module.exports = RecognitionTest;
