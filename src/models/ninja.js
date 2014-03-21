/*
Ok?

InternalError
noTwitCasting
500twitCasting
*/

var MINS_TILL_TIMEOUT, NinjaSchema, crypto, findOrCreate, getLiveStatusFromTwitCasting, getUserStatusFromTwitCasting, mc, mongoose, request, _;

mongoose = require('mongoose');

request = require('request');

crypto = require('crypto');

_ = require('underscore');

findOrCreate = require('./lib/findOrCreate');

MINS_TILL_TIMEOUT = 31;

NinjaSchema = new mongoose.Schema({
  id: String,
  social_id: String,
  isFromTwitter: Boolean,
  name: String,
  screen_name: String,
  avatar_url: String,
  lastSave: Date,
  firstAccess: Date,
  lastAccess: Date,
  isLive: Boolean,
  lastMovieId: Number,
  live_viewers_count: {
    type: Number,
    "default": 0
  },
  covering: Array,
  lat: Number,
  lng: Number
}, {
  id: false,
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

NinjaSchema.virtual('live_url').get(function() {
  return 'http://twitcasting.tv/' + this.id;
});

NinjaSchema.virtual('url').get = function() {
  return 'http://vempraruavem.org/#ninjas/' + this.id;
};

NinjaSchema.virtual('visible').get = function() {
  return this.isVisible();
};

NinjaSchema.statics.flushCache = function(cb) {
  console.log('Flushing ninjas in cache');
  return this.find({
    lastSave: {
      $gte: new Date(new Date().valueOf() - MINS_TILL_TIMEOUT * 60 * 1000)
    },
    lat: {
      $ne: null
    },
    lng: {
      $ne: null
    },
    isLive: true
  }, function(err, ninjas) {
    return mc.set('ninjas', JSON.stringify(ninjas), cb);
  });
};

NinjaSchema.statics.getCached = function(cb) {
  return mc.get('ninjas', function(err, val, key) {
    if (err) {
      console.warn('Cache error:', err);
      this.findVisible(cb);
    }
    if (val === null) {
      console.warn('Cache query for ninjas returned null.');
    }
    return cb(null, JSON.parse(val.toString()));
  });
};

getUserStatusFromTwitCasting = function(id, callback) {
  var onGetResults;
  onGetResults = function(err, res, obj) {
    console.log('Path reached:', res.request.uri.path);
    return callback(err, obj);
  };
  return request.get({
    url: 'http://api.twitcasting.tv/api/userstatus',
    json: true,
    qs: {
      user: id,
      type: 'json'
    }
  }, onGetResults);
};

getLiveStatusFromTwitCasting = function(id, callback) {
  var onGetResults;
  onGetResults = function(err, res, obj) {
    console.log('Path reached:', res.request.uri.path);
    return callback(err, obj);
  };
  return request.get({
    url: 'http://api.twitcasting.tv/api/livestatus',
    json: true,
    qs: {
      user: id,
      type: 'json'
    }
  }, onGetResults);
};

NinjaSchema.statics.findOrCreateFromInfo = function(data, callback) {
  var _this = this;
  return getUserStatusFromTwitCasting(data.username, function(err, twcProfile) {
    if (err) {
      return callback({
        type: '500twitCasting'
      });
    }
    if (!twcProfile.userid) {
      return callback({
        type: 'noTwitCasting'
      });
    }
    return getLiveStatusFromTwitCasting(data.username, function(err, twcLive) {
      if (err) {
        return callback({
          type: '500twitCasting'
        });
      }
      return _this.findOrCreate({
        social_id: twcProfile.socialid
      }, function(err, ninja, isNew) {
        if (err) {
          return callback({
            type: 'InternalError'
          });
        }
        ninja.id = twcProfile.userid;
        ninja.isFromTwitter = data.isTwitter || false;
        ninja.name = twcProfile.name;
        ninja.screen_name = twcProfile.screenname;
        ninja.avatar_url = data.avatar_url;
        if (twcLive.islive) {
          ninja.isLive = true;
          ninja.live_viewers_count = twcLive.viewers;
        } else {
          ninja.isLive = false;
          ninja.live_viewers_count = 0;
        }
        ninja.lastSave = new Date();
        ninja.lastAccess = new Date();
        if (isNew) {
          ninja.firstAccess = ninja.lastSave;
        }
        ninja.lat = data.lat || null;
        ninja.lng = data.lng || null;
        return ninja.save(function(err) {
          console.log('Adding ninja', _.pick(ninja, ['isLive', 'live_viewers_count']));
          return callback(err, ninja);
        });
      });
    });
  });
};

NinjaSchema.statics.createFromTwitterProfile = function(twtProfile, callback) {
  return this.findOrCreateFromInfo({
    username: twtProfile.username,
    social_id: twtProfile._json.id_str,
    isTwitter: true,
    avatar_url: twtProfile.photos[0].value
  }, callback);
};

NinjaSchema.statics.createFromFacebookProfile = function(fbProfile, callback) {
  return this.findOrCreateFromInfo({
    username: 'f:' + fbProfile.id,
    social_id: 'f:' + fbProfile.id,
    isTwitter: false,
    avatar_url: 'http://graph.facebook.com/' + fbProfile.id + '/picture'
  }, callback);
};

NinjaSchema.statics.findVisible = function(cb) {
  var conds;
  conds = {
    lastSave: {
      $gte: new Date(new Date().valueOf() - MINS_TILL_TIMEOUT * 60 * 1000)
    },
    lat: {
      $ne: null
    },
    lng: {
      $ne: null
    },
    isLive: true
  };
  return this.find.call(this, [conds].concat(arguments), cb);
};

NinjaSchema.statics.findOrCreate = findOrCreate;

NinjaSchema.statics.updateAll = function(cb) {
  var _this = this;
  return this.find({}, function(err, ninjas) {
    var count, dec, ninja, _i, _len, _results;
    count = ninjas.length;
    dec = function() {
      count -= 1;
      if (count <= 0) {
        return _this.flushCache(cb);
      }
    };
    if (err) {
      if (typeof cb === "function") {
        cb(err);
      }
      return;
    }
    _results = [];
    for (_i = 0, _len = ninjas.length; _i < _len; _i++) {
      ninja = ninjas[_i];
      if (ninja.isLive) {
        _results.push(ninja.updateLiveStatus(function(err, ninja) {
          console.log("Updated: ninja=" + ninja.screen_name + ", status=" + ninja.isLive);
          return dec();
        }));
      } else {
        _results.push(dec());
      }
    }
    return _results;
  });
};

mc = require('memjs').Client.create();

NinjaSchema.methods.isVisible = function() {
  return this.isLive && this.lat && this.lng && this.getTillTimeout() > 0;
};

NinjaSchema.methods.getTimeout = function() {
  return MINS_TILL_TIMEOUT * 60 * 1000 + 1 * new Date(this.lastSave);
};

NinjaSchema.methods.getTillTimeout = function() {
  return Math.max(0, MINS_TILL_TIMEOUT * 60 * 1000 - (new Date() - this.lastSave));
};

NinjaSchema.methods.updateLiveStatus = function(callback) {
  var _this = this;
  return getLiveStatusFromTwitCasting(this.id, function(err, twcLive) {
    if (err) {
      return callback({
        type: '500twitCasting'
      });
    }
    _this.isLive = twcLive.islive;
    _this.live_viewers_count = twcLive.viewers;
    _this.lastAccess = new Date();
    if (_this.getTillTimeout() < 0) {
      console.log('invalidating user', _this.getTillTimeout(), 1 * _this.lastSave);
      _this.lat = _this.lng = null;
    }
    return _this.save(function(err) {
      if (err) {
        return callback({
          type: 'InternalError'
        }, _this);
      }
      return callback(err, _this);
    });
  });
};

NinjaSchema.methods.reFetch = function(callback) {
  return callback != null ? callback : callback = function() {};
};

module.exports = mongoose.model("Ninja", NinjaSchema);
