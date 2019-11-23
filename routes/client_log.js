var express = require('express');
const fs = require('fs');
const readline = require('readline');
const querystring =  require('querystring')
const csvWriter = require('csv-write-stream')
const useragent = require('useragent');
var router = express.Router();

const CsvLogger = require("../lib/csv-logger");

/* GET users listing. */


router.get('/log_test', function (req, res) {
  console.log('log_test')
    res.send('log server confirmation');
})

router.get('/reflesh', function (req, res) {
  const csv_logger = CsvLogger.instance;
  csv_logger.reflesh();
  res.send('csv data has been refleshed');
})

router.get('/user-agent', function (req, res) {
  const _user_agent = req.headers['user-agent']

  res.send(_user_agent);

})




router.get('/', function(req, res, next) {
//    console.log("log is called");
    const query_obj = req.query;

    var agent = useragent.parse(req.headers['user-agent']);
    const _user_agent = req.headers['user-agent']
    const browser= agent.toAgent();
    
    const csv_logger = CsvLogger.instance;
    csv_logger.write(query_obj, browser, _user_agent);
    res.header({"Access-Control-Allow-Origin":"*"}).json({log:'yes'});
});

module.exports = router;
