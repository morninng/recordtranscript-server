var express = require('express');
var router = express.Router();




router.get('/', function(req, res, next) {
    console.log("time retrieval");
    const current_time = Date.now();

   // res.header({"Access-Control-Allow-Origin":"*"})
    res.send(String(current_time));
});

module.exports = router;
