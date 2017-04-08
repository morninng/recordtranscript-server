
const express = require('express');
const path = require('path');


const app = require('./lib/server').app;

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
const record_recognition = require("./routes/record_recognition");
app.use('/translate', translate);
app.use('/client_log', client_log);
app.use('/date_retrieve', date_retrieve);
app.use('/record_recognition', date_retrieve);

const loggerRequest = require("./lib/logger");






