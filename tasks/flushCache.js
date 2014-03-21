var count, e, exit, mongoUri, mongoose;

if (module === require.main) {
  try {
    require('../src/env.js');
  } catch (_error) {
    e = _error;
  }
  mongoose = require('mongoose');
  mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/madb';
  mongoose.connect(mongoUri);
  exit = function(err) {
    console.log("Process terminated. No check for errors.");
    mongoose.connection.close();
    return process.exit(0);
  };
  console.log('Starting to fetch all events.');
  count = 2;
  require('../src/models/ninja.js').flushCache(function() {
    if (-count <= 0) {
      return exit();
    }
  });
  require('../src/models/event.js').flushCache(function() {
    if (--count <= 0) {
      return exit();
    }
  });
} else {
  throw "This module is supposed to be executed as a job.";
}
