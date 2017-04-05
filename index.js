
const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const ss = require('socket.io-stream');
const wav = require('wav');
const sox = require('sox');
const SoxCommand = require('sox-audio');
const firebase_admin = require("firebase-admin");
const serviceAccount = require("./secret/mixidea-91a20-firebase-adminsdk.json");
const config = require('./config/mixidea.conf');
const wavFileInfo = require('wav-file-info');
const mkdirp = require('mkdirp');

firebase_admin.initializeApp({
  credential: firebase_admin.credential.cert("secret/mixidea-91a20-firebase-adminsdk.json"),
  databaseURL: "https://mixidea-91a20.firebaseio.com"
});



const serverPort = 3000;
//const serverPort = 80;
const serverHost = "127.0.0.1";

const app = express();
//const httpServer = https.createServer(credentials,app);
const httpServer = http.createServer(app);
const server = httpServer.listen(serverPort,  serverHost, ()=> {
//const server = httpServer.listen(serverPort, /* serverHost,*/ ()=> {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
//  loggerRequest.info('Example app listening at http://%s:%s', host, port);
});



app.get('/', (req, res)=> {
  console.log('root is called'); 
  res.send('Hello World recording server!');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const translate = require("./routes/translate");
const client_log = require("./routes/client_log");
const date_retrieve = require("./routes/date_retrieve");
app.use('/translate', translate);
app.use('/client_log', client_log);
app.use('/date_retrieve', date_retrieve);





const io = require('socket.io').listen(server);
io.sockets.setMaxListeners(Infinity);



const mixidea_io = io.of('/mixidea')
mixidea_io.on('connection',(socket)=>{

  console.log("user connect to mixidea io : ", socket.id);
//  loggerRequest.info("user connect to mixidea io : ", socket.id);

  socket.on('disconnect', function(){
    console.log("user disconnected socket id=" + socket.id);
 //   loggerRequest.info("user disconnected socket id=" + socket.id);
  });

	ss(socket).on('record_start_or_resume', (stream, data)=>{
			stream.setMaxListeners(Infinity);
      const event_id = data.event_id;
      const role = data.role;
      const speech_id = data.speech_id;
      const short_split_id = data.short_split_id;
			console.log("audio record start socket id=" + socket.id + "event_id: " + event_id );
      const remote_file_name = get_remote_file_name_raw(event_id, role, speech_id, short_split_id);
      var remoteWriteStream = bucket_raw.file(remote_file_name).createWriteStream();
      stream.pipe(remoteWriteStream);

	});

  socket.on('record_suspend', function(data){
    console.log("audio record end socket id=" + socket.id);
    execute_recognition(data);

  });


  socket.on('record_finish', function(data){
    console.log("audio record end socket id=" + socket.id);
    execute_recognition(data);

    const whole_speech_duration = Number(data.whole_speech_duration);
    console.log("whole_speech_duration", whole_speech_duration);
    
    setTimeout(()=>{
        concatenate_audiofile(data);
      }
      ,whole_speech_duration*2 +20*1000
    );

  });
});


// https://www.npmjs.com/package/@google-cloud/storage

const gcs = require('@google-cloud/storage')({
  projectId: 'grape-spaceship-123',
  keyFilename: './secret/cloud-function-test-192f31cb3070.json'
});

 const bucket_raw = gcs.bucket('mixidea-audio-raw');
 const bucket_raw_path = "gs://mixidea-audio-raw/";
 const bucket_used = gcs.bucket('mixidea-audio-used');
 const bucket_used_path = "gs://mixidea-audio-used/";

 

function get_remote_file_name_raw(event_id, role, speech_id, short_split_id){
  return  event_id + "/" + role + "__" + speech_id + "__" + short_split_id + '.raw';
}

function get_remote_file_path_raw(event_id, role, speech_id, short_split_id){

  return   bucket_raw_path + get_remote_file_name_raw(event_id, role, speech_id, short_split_id);
}

function get_remote_file_name_used(event_id, role, speech_id, short_split_id){
  return  event_id + "/" + role + "__" + speech_id +  '.mp3';
}

function get_local_filename_raw(event_id , short_split_id){
  return './public/audio/'+ event_id + "/" + short_split_id + '.raw';
}
function get_local_filename_wav(event_id , short_split_id){
  return './public/audio/'+ event_id + "/" + short_split_id + '.wav';
}

function get_local_filename_mp3(event_id, speech_id){
  return './public/audio/' + event_id + "/"  + speech_id + '.mp3';
}

function get_local_folder(event_id){
  return './public/audio/' + event_id;
}



function execute_recognition(data){

    const event_id = data.event_id;
    const role = data.role;
    const speech_id = data.speech_id;
    const short_split_id = data.short_split_id;
    const each_speech_duration = Number(data.each_speech_duration);

    setTimeout(
      ()=>{
        const sample_rate = data.sample_rate || 44100;
        const outfile_name  = data.filename;
        const event_id = data.event_id;
        const gcsUri = get_remote_file_path_raw(event_id, role, speech_id, short_split_id);
        asyncRecognizeGCS(gcsUri ,'LINEAR16',  sample_rate, data);
      },
      3*1000 + each_speech_duration
    )
}





// sample is here.
// https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/speech

function asyncRecognizeGCS (gcsUri, encoding, sampleRate, data) {

  console.log("asyncRecognizeGCS start", gcsUri);
  const Speech = require('@google-cloud/speech');
  const speech = Speech();
  const request = {
    encoding: encoding,
    sampleRate: sampleRate
  };

  speech.startRecognition(gcsUri, request)
    .then((results) => {
      const operation = results[0];
      return operation.promise();
    })
    .then((transcription) => {
      console.log(`Transcription: ${transcription}`);
      if(transcription && transcription[0]){
        save_transcription(transcription[0], data);
      }
      
    });
}


function save_transcription(transcription, data){
  console.log("save_transcription");

  const event_id = data.event_id;
  const role = data.role;
  const speech_id = data.speech_id;
  const deb_style = data.deb_style;
  const short_split_id = data.short_split_id;
  const user = data.short_split_id;
  const speech_type = data.speech_type;
  const sample_rate = data.sample_rate;

  const transcript_obj = {
    context: transcription,
    user,
    speech_type,
    sample_rate
  }

  var child_path = "event_related/audio_transcriptserver/" + event_id +"/" + deb_style  + "/" + role + "/" + speech_id + "/spech_context/" + short_split_id;
	console.log(child_path);
  const database = firebase_admin.database();
  
  database.ref(child_path).set(transcript_obj, (error)=>{
		if (error) {
			console.log("saving transcription on firabase failed");
		} else {
			console.log("saving transcription on firebase succeedevent id ");
		}
  });

}

function concatenate_audiofile(data){
    console.log("concatenate audoi file is called");
    const event_id = data.event_id;
    const role = data.role;
    const deb_style = data.deb_style;
    const speech_id = data.speech_id;
    const dirname = get_local_folder(event_id)
    mkdirp(dirname);

    const firebase_child_path = "event_related/audio_transcriptserver/" + event_id +"/" + deb_style  + "/" + role + "/" + speech_id + "/spech_context/";

    const database = firebase_admin.database();
    database.ref(firebase_child_path).once("value", (snapshot) => {
      console.log("audio_transcriptserver", snapshot.val());
      const audiotranscript_obj = snapshot.val();
      let numbe_of_speech = 0;
      let speech_downloaded = 0;
      let downloaded_shortsplitid_arr = [];
      for(let key in audiotranscript_obj){
        let short_split_id = key;
        let sample_rate = audiotranscript_obj[key].sample_rate;
        let remote_file_name_raw = get_remote_file_name_raw(event_id, role, speech_id, short_split_id);
        console.log(remote_file_name_raw);
        let local_file_name_raw = get_local_filename_raw(event_id, short_split_id);

        bucket_raw.file(remote_file_name_raw).download({
          destination: local_file_name_raw
        }, (err)=> {
          speech_downloaded++;
          if(!err){
            downloaded_shortsplitid_arr.push(short_split_id);
            convert_rawfile_to_unique_samplinrate_wav( data, short_split_id, sample_rate );
          }else{
            console.log("download failed", err);
          }
          if(numbe_of_speech == speech_downloaded){
            setTimeout(()=>{
              wavconcatenate_convertmp3(data, downloaded_shortsplitid_arr)     
            },20*1000)
          }
        });
        numbe_of_speech++;
      }
    });

    console.log("concatenate_audiofile");
}



const convert_rawfile_to_unique_samplinrate_wav = function(data, short_split_id, sample_rate){


  const event_id = data.event_id;
  const input_file = get_local_filename_raw(event_id, short_split_id);
  console.log("input_file", input_file)
  const dest_file = get_local_filename_wav(event_id, short_split_id);
  console.log("dest_file", dest_file);

	var wstream = fs.createWriteStream(dest_file);
	var command = SoxCommand().output(wstream).outputSampleRate(44100).outputEncoding('signed').outputBits(16).outputChannels(1).outputFileType('wav');
  command.input(input_file).inputSampleRate(sample_rate).inputEncoding('signed').inputFileType('raw').inputChannels(1).inputBits(16);
	command.on('end', function() {
    console.log("convert succeed");
    set_speech_duration(data, short_split_id);
	});
	command.on('error', function(err, stdout, stderr) {
    console.log("convert fail", err);
	});
	command.run();
}


function set_speech_duration(data, short_split_id){

    const event_id = data.event_id;
    const role = data.role;
    const deb_style = data.deb_style;
    const speech_id = data.speech_id;
    const firebase_child_path_duration = "event_related/audio_transcriptserver/" + event_id +"/" + deb_style  + "/" + role + "/" + speech_id + "/spech_context/" + short_split_id + "/duration";
    const file_name = get_local_filename_wav(event_id, short_split_id);

    wavFileInfo.infoByFilename(file_name, function(err, info){
      if (!err){
        //save duration to firebase
        console.log(info)
        duration = info.duration || 10;
        console.log(duration);
      }else{
        console.log("retrieving file info failed", err);
        duration = 10;
      }

      const database = firebase_admin.database();
      database.ref(firebase_child_path_duration).set(duration, (error)=>{
        if (error) {
          console.log("saving duration on firabase failed");
        } else {
          console.log("saving duration on firebase succeedevent");
        }
      });
    });
}


function wavconcatenate_convertmp3(data, downloaded_shortsplitid_arr){

  const event_id = data.event_id;
  const role = data.role;
  const deb_style = data.deb_style;
  const speech_id = data.speech_id;

  const dest_file = get_local_filename_mp3(event_id, speech_id);
  console.log("mp3 dest file", dest_file)
	const wstream = fs.createWriteStream(dest_file);
	const command = SoxCommand().output(wstream).outputFileType('mp3');

	downloaded_shortsplitid_arr.forEach(
    (short_split_id)=>{
      const each_file_name = get_local_filename_wav(event_id, short_split_id);
      console.log("each_file_name", each_file_name);
      command.input(each_file_name).inputSampleRate(44100).inputEncoding('signed').inputBits(16).inputChannels(1).inputFileType('wav');
    }
  )

	command.on('progress', (progress)=> {
	  console.log('Processing progress: ', progress);
	});
	 
	command.on('error', (err, stdout, stderr)=> {
	  console.log('transcode and connecting audio failed: ' + err);
	});
	 
	command.on('end', ()=> {
		console.log('transcode and connecting audio succeeded!');
    save_file(data)
		wstream.end();

	});
	command.run();
}



function save_file(data){

  const event_id = data.event_id;
  const speech_id = data.speech_id;
  const role = data.role;

	const local_file = get_local_filename_mp3(event_id, speech_id);
  const remote_file = get_remote_file_name_used(event_id, role, speech_id);

  const localReadStream = fs.createReadStream(local_file);
  const remoteWriteStream = bucket_used.file(remote_file).createWriteStream();
  localReadStream.pipe(remoteWriteStream);

}





