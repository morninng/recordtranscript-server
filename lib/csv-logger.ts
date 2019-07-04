

const config = require('./../config/mixidea.conf');
// const csvWriter = require('csv-write-stream')

import * as csvWriter from 'csv-write-stream'
import * as fs from 'fs'

export const BLANK_LOG_OBJ = {level: 's', user_name: 's', file_name: 's', message: 's', type: 's', client_time: 's', tech: 's', module: 's', useragent: 's', browser: 's' }


const CSV_WRITER_OPTION =  {
  headers:["level","user_name","file_name",'message','type',"server_time","client_time","event_id","user_id","tech",'module','element','send_type','browser','useragent','trace'],
  separator: '\t'}

export class CsvLogger{

  private static _instance: CsvLogger;

  public static get instance():CsvLogger{
    if(!this._instance){
      this._instance = new CsvLogger();
      console.log('CsvLogger created');
    }else{
      console.log('csvLogger already existed');
    }
    return this._instance;
  };
  private constructor(){} // instance cannot be created outside of this class


  global_logger

  test(){

  }

  reflesh() {
    this.global_logger = csvWriter(CSV_WRITER_OPTION);
    this.global_logger.pipe(fs.createWriteStream('./public/log/client_log.txt'));
  }


  write(log_obj, browser, useragent) {
    if(!this.global_logger){
      this.global_logger = csvWriter(CSV_WRITER_OPTION);
      this.global_logger.pipe(fs.createWriteStream('./public/log/client_log.txt'));
    }
    log_obj = log_obj || {};
    log_obj['useragent'] = useragent || 's'
    log_obj['browser'] = browser || 's'
    log_obj['server_time'] = new Date().toUTCString();

    const converted_log_obj = Object.assign({}, BLANK_LOG_OBJ, log_obj);
    for(let key in log_obj){
      converted_log_obj[key] = converted_log_obj[key].replace(/\t/g,'');
      converted_log_obj[key] = converted_log_obj[key].replace(/ ,/g,'');
      converted_log_obj[key] = converted_log_obj[key].replace(/, /g,'');
      converted_log_obj[key] = converted_log_obj[key].replace(/"/g,'');
      converted_log_obj[key] = converted_log_obj[key].replace(/'/g,'');
      converted_log_obj[key] = "\"" + converted_log_obj[key] + "\"";
    }
    this.global_logger.write(converted_log_obj);
  }

}

module.exports = CsvLogger;
