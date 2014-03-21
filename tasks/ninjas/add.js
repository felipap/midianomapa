var jobber;

jobber = require('../jobber.js')(function(e) {
  var Ninja;
  console.log("Adding ninja {id:" + process.argv[2] + "}.");
  if (!process.argv[5]) {
    console.log('Usage node ./add.coffee <userid> <lat> <lng> <avatar_url>');
    return e.quit(true);
  }
  Ninja = require('../../src/models/ninja.js');
  return Ninja.findOrCreateFromInfo({
    username: process.argv[2],
    isTwitter: true,
    lat: parseFloat(process.argv[3]) || null,
    lng: parseFloat(process.argv[4]) || null,
    avatar_url: process.argv[5]
  }, function(err) {
    return Ninja.flushCache(function(err2) {
      return e.quit(err || err2);
    });
  });
}).start();
