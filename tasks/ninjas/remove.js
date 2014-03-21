var jobber;

jobber = require('../jobber.js')(function(e) {
  var Ninja;
  console.log("Removing ninja {id:" + process.argv[2] + "}.");
  Ninja = require('../../src/models/ninja.js');
  return Ninja.remove({
    id: process.argv[2]
  }, function(err, count) {
    console.log("Count affected: " + count + ".");
    return Ninja.flushCache(function(err2) {
      return e.quit(err || err2);
    });
  });
}).start();
