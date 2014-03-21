var jobber;

jobber = require('./jobber.js')(function(e) {
  var Event, count, eventsCount, tag, tags, _i, _len, _results;
  Event = require('../src/models/event.js');
  tags = ['passeata', 'protesto', 'manifestação', 'ato+apoio', 'ato+contra', 'ato+em', 'mobilização+contra'];
  console.log('Starting to search facebook with tags:', tags);
  count = tags.length;
  eventsCount = 0;
  _results = [];
  for (_i = 0, _len = tags.length; _i < _len; _i++) {
    tag = tags[_i];
    _results.push((function(tag) {
      return Event.crawlAndAdd(tag, process.env.facebook_perm_access_token, function(err, docs) {
        count--;
        console.log('remaining:', count);
        if (err) {
          console.log({
            tag: tag,
            error: err
          });
          if (err.name === 'cantFetch') {
            return console.warn('{"message":"You sure that token is still good?"}');
          }
        } else {
          eventsCount += docs.length;
          console.log({
            tag: tag,
            count: docs.length
          });
          if (count <= 0) {
            Event.flushCache();
            console.log("Total events added:", eventsCount);
            console.log("Process terminated. err:", err);
            return e.quit(true);
          }
        }
      });
    })(tag));
  }
  return _results;
}).start();
