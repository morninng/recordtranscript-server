"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SoxCommand = require("sox-audio");
const wavFileInfo = require("wav-file-info");
const mkdirp = require("mkdirp");
const fs = require("fs");
const firebase_admin = require("firebase-admin");
const GCS = require("@google-cloud/storage");
const config = require('./../config/mixidea.conf');
const loggerRequest = require("./../lib/logger");
class RecordRecognition {
    constructor() {
        this.gcs = null;
        this.bucket_raw = null;
        this.bucket_raw_path = null;
        this.bucket_used_name = null;
        this.bucket_used = null;
        this.bucket_used_path = null;
        this.record_start_or_resume = (stream, data) => {
            stream.setMaxListeners(Infinity);
            const event_id = data.event_id;
            const role = data.role;
            const speech_id = data.speech_id;
            const short_split_id = data.short_split_id;
            this.save_startdata(data);
            const remote_file_name = this.get_remote_file_name_raw(event_id, role, speech_id, short_split_id);
            let remoteWriteStream = this.bucket_raw.file(remote_file_name).createWriteStream();
            stream.pipe(remoteWriteStream);
            // stream end is called when the stream is normally ended by the user. emoteWriteStream will finish automatically 
            stream.on('end', () => {
                console.log("---stream end---", data.short_split_id);
                loggerRequest.info("---stream end---", data.short_split_id);
            });
            // close is called when user has disconnected from the socket
            stream.on('close', () => {
                console.log("---stream closed---", data.short_split_id);
                loggerRequest.info("---stream closed---", data.short_split_id);
                setTimeout(() => {
                    if (remoteWriteStream) {
                        console.log("---end existing_remoteWriteStream---" + event_id + "__" + short_split_id);
                        loggerRequest.info("---end existing_remoteWriteStream---" + event_id + "__" + short_split_id);
                        remoteWriteStream.end();
                    }
                }, 30 * 1000);
            });
            remoteWriteStream.on('finish', () => {
                console.log("---remoteWriteStream finish---", event_id + "__" + short_split_id);
                loggerRequest.info("---remoteWriteStream finish---", event_id + "__" + short_split_id);
                this.execute_recognition(data);
            });
        };
        this.record_suspend = (data) => {
            this.save_each_duration(data);
        };
        this.record_finish = (data) => {
            this.save_each_duration(data);
            const whole_speech_duration = Number(data.whole_speech_duration) || 420 * 1000;
            console.log("whole_speech_duration", whole_speech_duration);
            loggerRequest.info("whole_speech_duration", whole_speech_duration);
            setTimeout(() => {
                this.concatenate_audiofile(data);
            }, whole_speech_duration * 3 + 90 * 1000);
        };
        this.save_each_duration = (data) => {
            const event_id = data.event_id;
            const deb_style = data.deb_style;
            const role = data.role;
            const speech_id = data.speech_id;
            const short_split_id = data.short_split_id;
            const each_speech_duration = Number(data.each_speech_duration) || 30 * 1000;
            const durationclient_path = this.get_firebasepath_durationclient(event_id, deb_style, role, speech_id, short_split_id);
            console.log(durationclient_path);
            loggerRequest.info(durationclient_path);
            const database = firebase_admin.database();
            database.ref(durationclient_path).set(each_speech_duration, (error) => {
                if (error) {
                    console.log("saving each_speech_duration on firabase failed shortsplit id", short_split_id);
                    loggerRequest.info("saving each_speech_duration on firabase failed shortsplit id", short_split_id);
                }
                else {
                    console.log("saving each_speech_duration on firebase succeed shortsplit id", short_split_id);
                    loggerRequest.info("saving each_speech_duration on firebase succeed shortsplit id", short_split_id);
                }
            });
        };
        this.save_startdata = (data) => {
            const event_id = data.event_id;
            const role = data.role;
            const speech_id = data.speech_id;
            const deb_style = data.deb_style;
            const short_split_id = data.short_split_id;
            const user = data.user;
            const speech_type = data.speech_type;
            const sample_rate = data.sample_rate;
            const startdata_obj = {
                user,
                speech_type,
                sample_rate
            };
            const shortsplitid_path = this.get_firebasepath_shortsplitid(event_id, deb_style, role, speech_id, short_split_id);
            console.log(shortsplitid_path);
            loggerRequest.info(shortsplitid_path);
            const database = firebase_admin.database();
            database.ref(shortsplitid_path).set(startdata_obj, (error) => {
                if (error) {
                    console.log("saving startdata_obj on firabase failed shortsplit id", short_split_id);
                    loggerRequest.info("saving startdata_obj on firabase failed shortsplit id", short_split_id);
                }
                else {
                    console.log("saving startdata_obj on firebase succeed shortsplit id", short_split_id);
                    loggerRequest.info("saving startdata_obj on firebase succeed shortsplit id", short_split_id);
                }
            });
        };
        this.get_remote_file_name_raw = (event_id, role, speech_id, short_split_id) => {
            return event_id + "/" + role + "__" + speech_id + "__" + short_split_id + '.raw';
        };
        this.get_remote_file_path_raw = (event_id, role, speech_id, short_split_id) => {
            return this.bucket_raw_path + this.get_remote_file_name_raw(event_id, role, speech_id, short_split_id);
        };
        this.get_remote_file_name_used = (event_id, role, speech_id) => {
            return event_id + "/" + role + "__" + speech_id + '.mp3';
        };
        this.get_remote_file_name_used_storageurl = (event_id, role, speech_id) => {
            const remote_filename = this.get_remote_file_name_used(event_id, role, speech_id);
            return "https://storage.googleapis.com/" + this.bucket_used_name + "/" + remote_filename;
        };
        this.get_local_filename_raw = (event_id, short_split_id) => {
            return './public/audio/' + event_id + "/" + short_split_id + '.raw';
        };
        this.get_local_filename_wav = (event_id, short_split_id) => {
            return './public/audio/' + event_id + "/" + short_split_id + '.wav';
        };
        this.get_local_filename_mp3 = (event_id, speech_id) => {
            return './public/audio/' + event_id + "/" + speech_id + '.mp3';
        };
        this.get_local_folder = (event_id) => {
            return './public/audio/' + event_id;
        };
        this.get_firebasepath_speechcontext = (event_id, deb_style, role, speech_id) => {
            return "event_related/audio_transcriptserver/" + event_id + "/" + deb_style + "/" + role + "/" + speech_id + "/spech_context/";
        };
        this.get_firebasepath_audio = (event_id, deb_style, role, speech_id) => {
            return "event_related/audio_transcriptserver/" + event_id + "/" + deb_style + "/" + role + "/" + speech_id + "/audio/";
        };
        this.get_firebasepath_shortsplitid = (event_id, deb_style, role, speech_id, short_split_id) => {
            const speechcontext_path = this.get_firebasepath_speechcontext(event_id, deb_style, role, speech_id);
            return speechcontext_path + short_split_id + "/";
        };
        this.get_firebasepath_duration_wav = (event_id, deb_style, role, speech_id, short_split_id) => {
            const shortsplitid_path = this.get_firebasepath_shortsplitid(event_id, deb_style, role, speech_id, short_split_id);
            return shortsplitid_path + "duration_wav";
        };
        this.get_firebasepath_durationclient = (event_id, deb_style, role, speech_id, short_split_id) => {
            const shortsplitid_path = this.get_firebasepath_shortsplitid(event_id, deb_style, role, speech_id, short_split_id);
            return shortsplitid_path + "duration_client";
        };
        this.get_firebasepath_transcriptcontext = (event_id, deb_style, role, speech_id, short_split_id) => {
            const shortsplitid_path = this.get_firebasepath_shortsplitid(event_id, deb_style, role, speech_id, short_split_id);
            return shortsplitid_path + "context";
        };
        this.execute_recognition = (data) => {
            const sample_rate = data.sample_rate || 44100;
            const event_id = data.event_id;
            const role = data.role;
            const speech_id = data.speech_id;
            const short_split_id = data.short_split_id;
            console.log("finish waiting and start recognition of short split id", short_split_id);
            loggerRequest.info("finish waiting and start recognition of short split id", short_split_id);
            const gcsUri = this.get_remote_file_path_raw(event_id, role, speech_id, short_split_id);
            this.asyncRecognizeGCS(gcsUri, 'LINEAR16', sample_rate, data);
        };
        // sample is here.
        // https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/speech
        this.asyncRecognizeGCS = (gcsUri, encoding, sampleRate, data) => {
            const speech_id = data.speech_id;
            console.log("_____asyncRecognizeGCS start____", speech_id);
            loggerRequest.info("____asyncRecognizeGCS start____", speech_id);
            const Speech = require('@google-cloud/speech');
            const speech = Speech();
            const request = {
                encoding: encoding,
                sampleRate: sampleRate
            };
            console.log("recognition request parameter", request);
            loggerRequest.info("recognition request parameter", request);
            console.log("recognition request url", gcsUri);
            loggerRequest.info("recognition request url", gcsUri);
            speech.startRecognition(gcsUri, request)
                .then((results) => {
                const operation = results[0];
                return operation.promise();
            })
                .then((transcription) => {
                console.log(`Transcription: ${transcription}`);
                loggerRequest.info(`Transcription: ${transcription}`);
                if (transcription && transcription[0]) {
                    this.save_transcription(transcription[0], data);
                }
            });
        };
        this.save_transcription = (transcription, data) => {
            console.log("save_transcription");
            loggerRequest.info("save_transcription");
            const event_id = data.event_id;
            const role = data.role;
            const speech_id = data.speech_id;
            const deb_style = data.deb_style;
            const short_split_id = data.short_split_id;
            const transcriptcontext_path = this.get_firebasepath_transcriptcontext(event_id, deb_style, role, speech_id, short_split_id);
            console.log(transcriptcontext_path);
            loggerRequest.info(transcriptcontext_path);
            const database = firebase_admin.database();
            database.ref(transcriptcontext_path).set(transcription, (error) => {
                if (error) {
                    console.log("saving transcription on firabase failed shortsplit id", short_split_id);
                    loggerRequest.info("saving transcription on firabase failed shortsplit id", short_split_id);
                }
                else {
                    console.log("saving transcription on firebase succeed shortsplit id", short_split_id);
                    loggerRequest.info("saving transcription on firebase succeed shortsplit id", short_split_id);
                }
            });
        };
        this.concatenate_audiofile = (data) => {
            console.log("/////////concatenate audoi file start//////////");
            loggerRequest.info("/////////concatenate audoi file start//////////");
            const event_id = data.event_id;
            const role = data.role;
            const deb_style = data.deb_style;
            const speech_id = data.speech_id;
            const dirname = this.get_local_folder(event_id);
            mkdirp(dirname, (err) => { console.log("folder created"); });
            const speechcontext_path = this.get_firebasepath_speechcontext(event_id, deb_style, role, speech_id);
            console.log("speechcontext_path", speechcontext_path);
            loggerRequest.info("speechcontext_path", speechcontext_path);
            const database = firebase_admin.database();
            database.ref(speechcontext_path).once("value", (snapshot) => {
                console.log("audio_transcriptserver", snapshot.val());
                loggerRequest.info("audio_transcriptserver", snapshot.val());
                const audiotranscript_obj = snapshot.val();
                let numbe_of_speech = 0;
                let speech_downloaded = 0;
                let downloaded_shortsplitid_arr = [];
                let all_shortsplited_arr = [];
                for (let key in audiotranscript_obj) {
                    let short_split_id = key;
                    all_shortsplited_arr.push(short_split_id);
                    let sample_rate = audiotranscript_obj[key].sample_rate;
                    let remote_file_name_raw = this.get_remote_file_name_raw(event_id, role, speech_id, short_split_id);
                    console.log(remote_file_name_raw);
                    loggerRequest.info();
                    let local_file_name_raw = this.get_local_filename_raw(event_id, short_split_id);
                    this.bucket_raw.file(remote_file_name_raw).download({
                        destination: local_file_name_raw
                    }, (err) => {
                        speech_downloaded++;
                        if (!err) {
                            console.log("download data succeed for ", short_split_id);
                            loggerRequest.info("download data succeed for ", short_split_id);
                            downloaded_shortsplitid_arr.push(short_split_id);
                            this.convert_rawfile_to_unique_sampling_rate_wav(data, short_split_id, sample_rate);
                        }
                        else {
                            console.log("!!!download failed for ", short_split_id);
                            loggerRequest.info("!!!download failed for", short_split_id);
                        }
                        if (numbe_of_speech == speech_downloaded) {
                            setTimeout(() => {
                                const downloaded_ordered_shortspilitid = all_shortsplited_arr.filter((elem) => { return downloaded_shortsplitid_arr.indexOf(elem) != -1; });
                                console.log("all_shortsplited_arr", all_shortsplited_arr);
                                console.log("downloaded_shortsplitid_arr", downloaded_shortsplitid_arr);
                                console.log("downloaded_ordered_shortspilitid", downloaded_ordered_shortspilitid);
                                loggerRequest.info("all_shortsplited_arr", all_shortsplited_arr);
                                loggerRequest.info("downloaded_shortsplitid_arr", downloaded_shortsplitid_arr);
                                loggerRequest.info("downloaded_ordered_shortspilitid", downloaded_ordered_shortspilitid);
                                this.wavconcatenate_convertmp3(data, downloaded_ordered_shortspilitid);
                            }, 20 * 1000);
                        }
                    });
                    numbe_of_speech++;
                }
            });
            console.log("concatenate_audiofile");
            loggerRequest.info("concatenate_audiofile");
        };
        this.convert_rawfile_to_unique_sampling_rate_wav = (data, short_split_id, sample_rate) => {
            const event_id = data.event_id;
            const input_file = this.get_local_filename_raw(event_id, short_split_id);
            console.log("input_file", input_file);
            loggerRequest.info("input_file", input_file);
            const dest_file = this.get_local_filename_wav(event_id, short_split_id);
            console.log("dest_file", dest_file);
            loggerRequest.info("dest_file", dest_file);
            var wstream = fs.createWriteStream(dest_file);
            var command = SoxCommand().output(wstream).outputSampleRate(44100).outputEncoding('signed').outputBits(16).outputChannels(1).outputFileType('wav');
            command.input(input_file).inputSampleRate(sample_rate).inputEncoding('signed').inputFileType('raw').inputChannels(1).inputBits(16);
            command.on('end', () => {
                console.log("convert succeed");
                loggerRequest.info("convert succeed");
                this.set_speech_duration(data, short_split_id);
            });
            command.on('error', (err, stdout, stderr) => {
                console.log("convert fail", err);
                loggerRequest.info("convert fail", err);
            });
            command.run();
        };
        this.set_speech_duration = (data, short_split_id) => {
            const event_id = data.event_id;
            const file_name = this.get_local_filename_wav(event_id, short_split_id);
            wavFileInfo.infoByFilename(file_name, (err, info) => {
                if (!err) {
                    console.log("retrieving file info succeeded!!");
                    loggerRequest.info("retrieving file info succeeded!!");
                    if (info && info.duration) {
                        this.save_duration(data, short_split_id, info.duration);
                    }
                }
                else {
                    console.log("retrieving file info failed!!!!!!!!!");
                    loggerRequest.info("retrieving file info failed!!!!!!!!!");
                    if (err.header && err.header.chunk_size && err.header.sample_rate && err.header.bits_per_sample) {
                        console.log("chunk size", err.header.chunk_size);
                        console.log("sample_rate", err.header.sample_rate);
                        console.log("bits_per_sample", err.header.bits_per_sample);
                        const calculated_duration = err.header.chunk_size / err.header.sample_rate / err.header.bits_per_sample * 8;
                        console.log("calculated_duration", calculated_duration);
                        loggerRequest.info("calculated_duration", calculated_duration);
                        this.save_duration(data, short_split_id, calculated_duration);
                    }
                }
            });
        };
        this.save_duration = (data, short_split_id, duration) => {
            const event_id = data.event_id;
            const role = data.role;
            const deb_style = data.deb_style;
            const speech_id = data.speech_id;
            console.log("duration-wav", duration);
            loggerRequest.info("duration-wav", duration);
            const wavduration_path = this.get_firebasepath_duration_wav(event_id, deb_style, role, speech_id, short_split_id);
            console.log("wavduration_path", wavduration_path);
            loggerRequest.info("wavduration_path", wavduration_path);
            const database = firebase_admin.database();
            database.ref(wavduration_path).set(duration, (error) => {
                if (error) {
                    console.log("saving duration on firabase failed");
                    loggerRequest.info("saving duration on firabase failed");
                }
                else {
                    console.log("saving duration on firebase succeed");
                    loggerRequest.info("saving duration on firebase succeed");
                }
            });
        };
        this.wavconcatenate_convertmp3 = (data, downloaded_ordered_shortspilitid) => {
            const event_id = data.event_id;
            const role = data.role;
            const deb_style = data.deb_style;
            const speech_id = data.speech_id;
            const dest_file = this.get_local_filename_mp3(event_id, speech_id);
            console.log("mp3 dest file", dest_file);
            loggerRequest.info("mp3 dest file", dest_file);
            const wstream = fs.createWriteStream(dest_file);
            const command = SoxCommand().output(wstream).outputFileType('mp3');
            downloaded_ordered_shortspilitid.forEach((short_split_id) => {
                const each_file_name = this.get_local_filename_wav(event_id, short_split_id);
                console.log("each_file_name", each_file_name);
                loggerRequest.info("each_file_name", each_file_name);
                command.input(each_file_name).inputSampleRate(44100).inputEncoding('signed').inputBits(16).inputChannels(1).inputFileType('wav');
            });
            command.on('progress', (progress) => {
                console.log('Processing progress: ', progress);
                loggerRequest.info('Processing progress: ', progress);
            });
            command.on('error', (err, stdout, stderr) => {
                console.log('transcode and connecting audio failed: ' + err);
                loggerRequest.info('transcode and connecting audio failed: ' + err);
            });
            command.on('end', () => {
                console.log('transcode and connecting audio succeeded!');
                loggerRequest.info('transcode and connecting audio succeeded!');
                this.save_file_on_googlestorage(data);
                wstream.end();
            });
            command.run();
        };
        this.save_file_on_googlestorage = (data) => {
            const event_id = data.event_id;
            const speech_id = data.speech_id;
            const role = data.role;
            const local_file = this.get_local_filename_mp3(event_id, speech_id);
            const remote_file = this.get_remote_file_name_used(event_id, role, speech_id);
            console.log("remote_file", remote_file);
            loggerRequest.info("remote_file", remote_file);
            console.log("///////////saving mp3 file to cloud storage started////////////");
            loggerRequest.info("///////////saving mp3 file to cloud storage started////////////");
            const localReadStream = fs.createReadStream(local_file);
            const remoteWriteStream = this.bucket_used.file(remote_file).createWriteStream();
            localReadStream.pipe(remoteWriteStream);
            this.save_fileinfo_firebase(data);
        };
        this.save_fileinfo_firebase = (data) => {
            const event_id = data.event_id;
            const role = data.role;
            const deb_style = data.deb_style;
            const speech_id = data.speech_id;
            const storage_url = this.get_remote_file_name_used_storageurl(event_id, role, speech_id);
            console.log(storage_url);
            loggerRequest.info(storage_url);
            const audio_path = this.get_firebasepath_audio(event_id, deb_style, role, speech_id);
            console.log(audio_path);
            loggerRequest.info(audio_path);
            const database = firebase_admin.database();
            database.ref(audio_path).set(storage_url, (error) => {
                if (error) {
                    console.log("saving audio url on firabase failed");
                    loggerRequest.info("saving audio url on firabase failed");
                }
                else {
                    console.log("saving audio url  on firebase succeed");
                    loggerRequest.info("saving audio url  on firebase succeed");
                }
            });
        };
        // https://www.npmjs.com/package/@google-cloud/storage
        this.gcs = GCS({
            projectId: 'grape-spaceship-123',
            keyFilename: './secret/cloud-function-test-192f31cb3070.json'
        });
        this.bucket_raw = this.gcs.bucket(config.rawfile_bucketname);
        this.bucket_raw_path = "gs://" + config.rawfile_bucketname + "/";
        this.bucket_used_name = config.usedfile_bucketname;
        this.bucket_used = this.gcs.bucket(config.usedfile_bucketname);
        this.bucket_used_path = "gs://" + config.usedfile_bucketname + "/";
    }
}
exports.RecordRecognition = RecordRecognition;
module.exports = RecordRecognition;
