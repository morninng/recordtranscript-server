
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

var gcs = require('@google-cloud/storage')({
  projectId: 'grape-spaceship-123',
  keyFilename: './cloud-function-test-192f31cb3070.json'
});
 

 var bucket = gcs.bucket('nodetest-moriyama');
 

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

	ss(socket).on('audio_record_start', (stream, data)=>{
			console.log("audio record start socket id=" + socket.id);
	//		loggerRequest.info("audio record start socket id=" + socket.id);
			stream.setMaxListeners(Infinity);
			const outfile_name_original  = data.filename;
			const outfile_name = outfile_name_original.replace(/-/g, "");
      const event_id = data.event_id;
			const record_start_time = Date.now();
			console.log("audio record start at " + record_start_time + " socketid:" + socket.id);
	//		loggerRequest.info("audio record start at " + record_start_time + " socketid:" + socket.id);

			const sample_rate = data.sample_rate || 44100;
			eval("GlobalInfo.file_writer_count_" + outfile_name + "=1");
			eval("GlobalInfo.record_start_time_" + outfile_name + "=" + record_start_time);
		//	var outfile_name_wav  = './public/audio/' + outfile_name + "_1.wav";
			const outfile_name_wav  = './public/audio/' + event_id + "/" + outfile_name + "_1.wav";
			const outputfile_dir = './public/audio/' + event_id;
			if(!fs.existsSync(outputfile_dir)){
				fs.mkdirSync(outputfile_dir);
			}
			console.log("output file name is " + outfile_name_wav);
	//		loggerRequest.info("output file name is " + outfile_name_wav);

			var file_writer = new wav.FileWriter(
			 outfile_name_wav,
			 {channels:1,
			  sampleRate:sample_rate,
			  bitDepth:16}
			);
			stream.pipe(file_writer);
	});

	ss(socket).on('audio_record_resume', (stream, data)=>{
			console.log("audio record resume " + socket.id);
	//		loggerRequest.info("audio record resume " + socket.id);

			const outfile_name_original  = data.filename;
			const outfile_name = outfile_name_original.replace(/-/g, "");
			const prev_count = eval("GlobalInfo.file_writer_count_" + outfile_name );
			if(!prev_count){
				return;
			}
			const next_count = prev_count + 1;
			console.log("resume count is " + next_count);
	//		loggerRequest.info("resume count is " + next_count);
			const event_id = data.event_id;
			const sample_rate = data.sample_rate || 44100;

			eval("GlobalInfo.file_writer_count_" + outfile_name + "=next_count");
			var outfile_name_wav  = './public/audio/' + event_id + "/"  +  outfile_name + "_" + String(next_count)  + ".wav";
			console.log("output file name is " + outfile_name_wav);
	//		loggerRequest.info("output file name is " + outfile_name_wav);

			var file_writer = new wav.FileWriter(
				 outfile_name_wav, 
				 {channels:1,
				  sampleRate:sample_rate,
				  bitDepth:16}
			);
			stream.pipe(file_writer);
	});

  socket.on('audio_record_suspend', function(data){
    console.log("audio suspend " + socket.id);
 //   loggerRequest.info("audio suspend " + socket.id);
  });


  socket.on('audio_record_end', function(data){
    console.log("audio record end socket id=" + socket.id);
 //   loggerRequest.info("audio recording end " + socket.id);
    const outfile_name_original  = data.filename;
    const deb_style  = data.deb_style;
    const outfile_name = outfile_name_original.replace(/-/g, "");
    const role_name  = data.role_name;
    const event_id = data.event_id;
    const speech_id = data.speech_id;
    console.log("file name is " + outfile_name);
 //   loggerRequest.info("file name is " + outfile_name);
    console.log("role name is " + role_name);
 //   loggerRequest.info("role name is " + role_name);

    const record_start_time = eval("GlobalInfo.record_start_time_" + outfile_name);
    const audio_record_end_time = Date.now();
    const record_duration = audio_record_end_time - record_start_time;
    const count = eval("GlobalInfo.file_writer_count_" + outfile_name );
    console.log("audio record start " + record_start_time);
 //   loggerRequest.info("audio record start " + record_start_time);
    console.log("audio record end " + audio_record_end_time);
 //   loggerRequest.info("audio record end " + audio_record_end_time);
    console.log("recording duration is " + record_duration + " msec");
 //   loggerRequest.info("recording duration is " + record_duration + " msec");
    console.log("file count is " + count );
 //   loggerRequest.info("file count is " + count );
    eval(" delete GlobalInfo.file_writer_count_" + outfile_name );
    eval(" delete GlobalInfo.record_start_time_" + outfile_name );
    setTimeout(function(){
      convert_SampleRate_transcode_upload_S3(outfile_name,deb_style, count,  role_name, event_id, speech_id);

    }, record_duration);
  });


  socket.on('chat_message', function (data) {
    console.log(data);
  });


});



/*


// Upload a local file to a new file to be created in your bucket. 
bucket.upload('./resource/test.txt', function(err, file) {
  if (!err) {
    // "zebra.jpg" is now in your bucket. 
    console.log("upload success");
  }else{
      console.log("upload failed");
  }
});


bucket.upload('./resource/test2.txt', function(err, file) {
  if (!err) {
    // "zebra.jpg" is now in your bucket. 
    console.log("upload success");
  }else{
      console.log("upload failed");
  }
});




var localReadStream = fs.createReadStream('./resource/angular2_dist.png');
var remoteWriteStream = bucket.file('angular2_dist.png').createWriteStream();
localReadStream.pipe(remoteWriteStream);

*/
