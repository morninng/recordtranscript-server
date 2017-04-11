

const record_recognition_lib = require("./../lib/record_recognition");

var express = require('express');
var router = express.Router();
const loggerRequest = require("./../lib/logger");


router.get('/record_suspend', function(req, res, next) {
    console.log("record_recognition: record_suspend");
    const data = req.query;

    data.speech_id = Number(data.speech_id);
    data.short_split_id= Number(data.short_split_id);
    data.sample_rate = Number(data.sample_rate);
    data.each_speech_duration = Number(data.each_speech_duration);
    data.whole_speech_duration = Number(data.whole_speech_duration);

    record_recognition_lib.record_suspend(data);

    console.log("<<https: record_suspend>>audio record suspend  data : ", data);
    loggerRequest.info("<<https: record_suspend>>audio record suspend   data : ", data);
    res.send("record_suspend");
    
});



router.get('/record_finish', function(req, res, next) {

    console.log("record_recognition: record_finish");
    const data = req.query;

    data.speech_id = Number(data.speech_id);
    data.short_split_id= Number(data.short_split_id);
    data.sample_rate = Number(data.sample_rate);
    data.each_speech_duration = Number(data.each_speech_duration);
    data.whole_speech_duration = Number(data.whole_speech_duration);

    record_recognition_lib.record_finish(data);

    console.log("<<socket: record_finish>>audio record end  data : ", data);
    loggerRequest.info("<<socket: record_finish>>audio record end  data : ", data);
    res.send("record_finish");
});



module.exports = router;
