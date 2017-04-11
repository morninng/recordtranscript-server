
const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const ss = require('socket.io-stream');

const config = require('./config/mixidea.conf');
const app = express();

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
const record_recognition_route = require("./routes/record_recognition");
const record_recognition_lib = require("./lib/record_recognition");

app.use('/translate', translate);
app.use('/client_log', client_log);
app.use('/date_retrieve', date_retrieve);
app.use('/record_recognition', record_recognition_route);

const loggerRequest = require("./lib/logger");


const serverPort = 3000;
//const serverPort = 80;
const serverHost = "127.0.0.1";

const httpServer = http.createServer(app);
 const server = httpServer.listen(serverPort,  serverHost, ()=> {
// const server = httpServer.listen(serverPort, /* serverHost,*/ ()=> {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});




const gcs = require('@google-cloud/storage')({
  projectId: 'grape-spaceship-123',
  keyFilename: './secret/cloud-function-test-192f31cb3070.json'
});
 const bucket_raw = gcs.bucket(config.rawfile_bucketname);



const io = require('socket.io').listen(server);
io.sockets.setMaxListeners(Infinity);

const mixidea_io = io.of('/mixidea')

mixidea_io.on('connection',(socket)=>{
  console.log("<<socket: connection>>user connect to mixidea io : ", socket.id);
  loggerRequest.info("<<socket: connection>>user connect to mixidea io : ", socket.id);


  socket.on('disconnect', function(){
    console.log("<<socket: disconnect>>user disconnected socket id=" + socket.id);
    loggerRequest.info("<<socket: disconnect>>user disconnected socket id=" + socket.id);
  });

	ss(socket).on('record_start_or_resume', (stream, data)=>{

    record_recognition.record_start_or_resume(stream, data);

    console.log("<<socket: record_start_or_resume>>audio record start socket id=" + socket.id + " data: ", data );
    loggerRequest.info("<<socket: record_start_or_resume>>audio record start socket id=" + socket.id + " data: ", data );

	});

})



