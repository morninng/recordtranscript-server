var fs = require('fs');
 
var gcs = require('@google-cloud/storage')({
  projectId: 'grape-spaceship-123',
  keyFilename: './cloud-function-test-192f31cb3070.json'
});
 

 var bucket = gcs.bucket('nodetest-moriyama');
 
// Upload a local file to a new file to be created in your bucket. 
bucket.upload('./resource/test.txt', function(err, file) {
  if (!err) {
    // "zebra.jpg" is now in your bucket. 
    console.log("upload success");
  }else{
      console.log("upload failed");
  }
});


bucket.upload('./resource/test2.txt', function(err, file) {
  if (!err) {
    // "zebra.jpg" is now in your bucket. 
    console.log("upload success");
  }else{
      console.log("upload failed");
  }
});




var localReadStream = fs.createReadStream('./resource/angular2_dist.png');
var remoteWriteStream = bucket.file('angular2_dist.png').createWriteStream();
localReadStream.pipe(remoteWriteStream);

