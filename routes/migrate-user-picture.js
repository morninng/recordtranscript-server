var express = require('express');
var router = express.Router();

const CsvLogger = require("../lib/csv-logger");

const firebase_admin = require("firebase-admin");
const axios = require("axios");





async function check_userobj(){

  const user_basic_ref = `/users/user_basic/`;
  const snapshot = 
  await firebase_admin
  .database()
  .ref(user_basic_ref)
  .once('value');

  const user_obj = snapshot.val();
  console.log(user_obj);
  const user_leys = Object.keys(user_obj);
  const num_user = user_leys.length;
  return num_user
}



async function migrateAll(){

  const csv_logger = CsvLogger.instance;

  const user_basic_ref = `/users/user_basic/`;
  const snapshot = 
  await firebase_admin
  .database()
  .ref(user_basic_ref)
  .once('value')

  const user_obj = snapshot.val();
  console.log(　JSON.stringify(user_obj));
  const user_leys = Object.keys(user_obj);
  const num_user = user_leys.length;


  let i = 0;

  const success_user = []
  const faild_user = []
  const error_user = [];

  for(let key in user_obj){
    i++;
    const user = user_obj[key];

    if( !user.fb_id){
      console.log("not fb");
      csv_logger.write({message: `not fb`})

    }else if(user.pict_src){
      console.log("already have pict_src");
      csv_logger.write({message: `already have pict_src`})
    }else{

      const result = await sent_one_migration(key) || {};
      // console.log(result);
      switch(result.result){
        case "success":
          // console.log("success");
          success_user.push(key);
        break;
        case "fail":
          // console.log("fail");
          faild_user.push(key);
        break;
        case "error":
          // console.log("error");
          error_user.push(key);
        break;
      }   
    }
    // console.log(` ${i} / ${num_user}`);
    csv_logger.write({message: ` ${i} / ${num_user}---${key} ----- success: ${success_user.length} fail: ${faild_user.length} error: ${error_user.length} `})
    console.log(` ${i} / ${num_user}---${key} ----- success: ${success_user.length} fail: ${faild_user.length} error: ${error_user.length} `);
  }
  csv_logger.write({message: `!!!!!!!!!!!!!!!all finished!!!!!!!!!!!!!!!!`})
  console.log("!!!!!!!!!!!!!!!all finished!!!!!!!!!!!!!!!!");
  console.log(faild_user);
  csv_logger.write({message: ` -- ${JSON.stringify(faild_user)} --`})
  return faild_user;

}







async function sent_one_migration(key){

  const url = `https://us-central1-mixidea-91a20.cloudfunctions.net/migrateFaceookUserEach?user_id=${key}`
  // const url = `https://us-central1-mixidea-test-a2f1f.cloudfunctions.net/migrateFaceookUserEach?user_id=${key}`
  // const url = `https://us-central1-mixidea-europe.cloudfunctions.net/migrateFaceookUserEach?user_id=${key}`


  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  const response = await axios.get(url, config);
  // const csv_logger = CsvLogger.instance;
  // csv_logger.write({message: response.data})
  console.log(response.data)

  return response.data;

}

router.get('/check_userobj', async function(req, res, next) {


  console.log("t");

  const num_user = await check_userobj();

  const csv_logger = CsvLogger.instance;

 res.header({"Access-Control-Allow-Origin":"*"})
 res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
 res.header('Expires', '-1');
 res.header('Pragma', 'no-cache');

  res.send(`num_user ${num_user}`);
});




router.get('/', async function(req, res, next) {


  console.log("t");
  const csv_logger = CsvLogger.instance;
  csv_logger.write({message: `migration start`})

  const failed_users = await migrateAll();



 res.header({"Access-Control-Allow-Origin":"*"})
 res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
 res.header('Expires', '-1');
 res.header('Pragma', 'no-cache');

  res.json(failed_users);
});



module.exports = router;
