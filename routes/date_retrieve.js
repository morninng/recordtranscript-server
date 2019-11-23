var express = require('express');
var router = express.Router();

const CsvLogger = require("../lib/csv-logger");



router.get('/', function(req, res, next) {
    console.log("time retrieval");
    const current_time = Date.now();
    const csv_logger = CsvLogger.instance;
    csv_logger.write({message: `dateRetrieve ${current_time} - ${new Date()}`})
   res.header({"Access-Control-Allow-Origin":"*"})
   res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
   res.header('Expires', '-1');
   res.header('Pragma', 'no-cache');

    res.send(String(current_time));
});

module.exports = router;
