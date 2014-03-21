var _;

_ = require('underscore');

module.exports = function(conditions, doc, options, callback) {
  var _this = this;
  if (arguments.length < 4) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else if (typeof doc === 'function') {
      callback = doc;
      doc = {};
      options = {};
    }
  }
  return this.findOne(conditions, function(err, result) {
    if (err || result) {
      if (options && options.upsert && !err) {
        console.log("Object already here, so updating.", conditions);
        return _this.update(conditions, doc, function(err, count) {
          if (err) {
            return callback(err);
          }
          return _this.findOne(conditions, function(err, result) {
            return callback(err, result, false);
          });
        });
      } else {
        return callback(err, result, false);
      }
    } else {
      _.extend(conditions, doc);
      return _this.create(conditions, function(err, obj) {
        return callback(err, obj, true);
      });
    }
  });
};
