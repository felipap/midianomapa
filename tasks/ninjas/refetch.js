var jobber;

jobber = require('../jobber.js')(function(e) {
  var Ninja;
  console.log('Starting to refetch ninjas.');
  Ninja = require('../../src/models/ninja.js');
  return Ninja.updateAll(function(err) {
    return Ninja.flushCache(function(err2) {
      return e.quit(err || err2);
    });
  });
}).start();
