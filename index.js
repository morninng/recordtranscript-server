
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

const gcs = require('@google-cloud/storage')({
  projectId: 'grape-spaceship-123',
  keyFilename: './secret/cloud-function-test-192f31cb3070.json'
});

 const bucket = gcs.bucket('nodetest-moriyama');
 const bucket_path = "gs://nodetest-moriyama/"
 

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


test = 0;
test_socket_count = 0;
GlobalInfo = {}

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


//const client_log = require("./routes/client_log");
//const date_retrieve = require("./routes/date_retrieve");
//app.use('/translate', translate);
//app.use('/client_log', client_log);
//app.use('/date_retrieve', date_retrieve);




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
      var remoteWriteStream = bucket.file("raw/" + event_id + "/" + role + "__" + speech_id + "/" + short_split_id + '.raw').createWriteStream();
      stream.pipe(remoteWriteStream);

	});

  socket.on('record_suspend', function(data){
    console.log("audio record end socket id=" + socket.id);
    execute_recognition(data)

  });


  socket.on('record_finish', function(data){
    console.log("audio record end socket id=" + socket.id);
    execute_recognition(data);
    concatenate_audiofile(data);
  });
});


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
        asyncRecognizeGCS( bucket_path + "raw/" + event_id + "/" + role + "__" + speech_id + "/" + short_split_id + '.raw','LINEAR16',  sample_rate);
      },
      10*1000 + each_speech_duration * 2
    )
}

function concatenate_audiofile(){
    console.log("concatenate_audiofile");

}



// sample is here.
// https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/speech

function asyncRecognizeGCS (gcsUri, encoding, sampleRate) {

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
      save_transcription();
    });
}


function save_transcription(){
  console.log("save_transcription");
}

