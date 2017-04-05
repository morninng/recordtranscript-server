var express = require('express');
var router = express.Router();

const config = require('./../config/mixidea.conf');

const api_key = config.google_translate_apikey;
const googleTranslate = require('google-translate')(api_key);


/* GET users listing. */


router.get('/', function(req, res, next) {
  console.log("translation is called");
  const querystring = req.query;
  if(!querystring || !querystring.text || !querystring.target_lang){
    return;
  }
  
  console.log(querystring.text);
  googleTranslate.translate(querystring.text, querystring.target_lang, (err, translation)=>{

    console.log(translation.translatedText);
//    res.header('Access-Control-Allow-Origin', '*');
    res.status(200).send(translation.translatedText);

    if(querystring.firebase_ref){
      const database = firebase_admin.database();
      database.ref(querystring.firebase_ref).set(translation.translatedText);
    }

  })

});


module.exports = router;
