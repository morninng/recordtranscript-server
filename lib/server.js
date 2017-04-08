


const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');



const serverPort = 3000;
//const serverPort = 80;
const serverHost = "127.0.0.1";

const app = express();
const httpServer = http.createServer(app);
 const server = httpServer.listen(serverPort,  serverHost, ()=> {
// const server = httpServer.listen(serverPort, /* serverHost,*/ ()=> {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});



module.exports = {server, app};