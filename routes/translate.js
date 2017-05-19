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



router.get('/from_jp_to_en', function(req, res, next) {
  console.log("translation is called");
  const querystring = req.query;
  if(!querystring || !querystring.text){
    res.status(200).send("input is not proper");
    return;
  }

  console.log(querystring.text);
  googleTranslate.translate(querystring.text, 'en', (err, translation)=>{

    console.log(translation.translatedText);
//    res.header('Access-Control-Allow-Origin', '*');
    res.status(200).send(translation.translatedText);
  })

});



router.post('/from_jp_to_en', function(req, res, next) {

  console.log("translation is called");
  console.log(req.body);
  if(!req.body || !req.body.content){
    res.status(200).send("there is no context to translate");
    return;
  }

  console.log(req.body.content);
  googleTranslate.translate(req.body.content, 'en', (err, translation)=>{

    console.log(translation.translatedText);
    res.status(200).send(translation.translatedText);
  })

});



module.exports = router;
