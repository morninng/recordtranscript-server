var express = require('express');
const fs = require('fs');
const readline = require('readline');
const querystring =  require('querystring')
const csvWriter = require('csv-write-stream')
const useragent = require('useragent');
var router = express.Router();

/* GET users listing. */

const csv_writer_option =  {
    headers:["level","user_name","file_name",'message','type',"server_time","client_time","event_id","user_id","tech",'module','element','send_type','browser','useragent'],
    separator: '\t'}
let global_logger = null;

router.get('/log_test', function (req, res) {
    res.send('log server confirmation');
})

router.get('/reflesh', function (req, res) {
    global_logger = csvWriter(csv_writer_option);
    global_logger.pipe(fs.createWriteStream('./public/log/client_log.txt'));
    res.send('csv data has been refleshed');
})




router.get('/', function(req, res, next) {
    console.log("log is called");
    const query_obj = req.query;
    if(!global_logger){
        global_logger = csvWriter(csv_writer_option);
        global_logger.pipe(fs.createWriteStream('./public/log/client_log.txt'));
    }

    // if(query_obj['timestamp']){
    //     const timestamp = new Date(query_obj['timestamp']);
    //     query_obj['timestamp'] = timestamp.toISOString();
    // }

    var agent = useragent.parse(req.headers['user-agent']);
    query_obj['useragent'] = req.headers['user-agent']
    query_obj['browser'] = agent.toAgent();
    query_obj['server_time'] = new Date().toUTCString();

    for(let key in query_obj){
        query_obj[key] = query_obj[key].replace(/\t/g,'');
        query_obj[key] = query_obj[key].replace(/ ,/g,'');
        query_obj[key] = query_obj[key].replace(/, /g,'');
        query_obj[key] = query_obj[key].replace(/"/g,'');
        query_obj[key] = query_obj[key].replace(/'/g,'');
        query_obj[key] = "\"" + query_obj[key] + "\"";
    }

    global_logger.write(query_obj)
    res.header({"Access-Control-Allow-Origin":"*"})
    res.sendStatus(200);
});


module.exports = router;
