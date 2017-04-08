

var log4js = require('log4js');
log4js.configure({
    appenders: [
        {
            "type": "dateFile",
            "category": "request",
            "filename": "./public/log/server_log.log",
            "pattern": "-yyyy-MM-dd"            
        },

    ]
});
const loggerRequest = log4js.getLogger('request');

module.exports = loggerRequest;