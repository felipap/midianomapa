/*
# models/event.coffee
# Event model.


Sample Facebook event.
reference: https://developers.facebook.com/docs/reference/api/event/
These fields are not always complete/existent.
{
	id: String
	owner:
		name: String
		id: String # the owner's Facebook userId
	name: String,
	description: String
	start_time: String # ISO-8601 formatted date/time
	timezone: String # IANA format (eg. Brazil/Acre)
	is_date_only: Boolean
	location: String
	venue: {
		latitude: Float
		longitude: Float
		city: String
		state: String
		country: String
		id: String
		street: String
		zip: String
	}
	privacy: String # 'OPEN', 'SECRET', 'FRIENDS'
	updated_time: String # ISO-8601 formatted date/time
}
*/

var BLOCKED_IDS, BannedEventsSchema, Event, EventSchema, MIN_COUNT, RequestDeferer, SEARCH_N_ADD_MINCOUNT, VALID_TMZs, async, createValidator, crypto, eventExceptions, fbEventValidator, fbRequester, findOrCreate, gMapsRequester, genericErrorHandler, log, memjs, mongoose, notNull, notOver, request, toFbObject, _,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

mongoose = require('mongoose');

request = require('request');

crypto = require('crypto');

memjs = require('memjs');

async = require('async');

_ = require('underscore');

findOrCreate = require('./lib/findOrCreate');

RequestDeferer = require('./lib/deferer');

createValidator = require('./lib/validator');

log = _.bind(console.log, console);

/* Configure program*/


SEARCH_N_ADD_MINCOUNT = 20;

VALID_TMZs = ['Brazil/Acre', 'Brazil/West', 'Brazil/East', 'Brazil/Sao_Paulo', 'Brazil/Acre', 'Brazil/DeNoronha', 'America/Rio_Branco', 'America/Noronha', 'America/Manaus', 'America/Porto_Velho', 'America/Santarem', 'America/Araguaiana', 'America/Bahia', 'America/Belem', 'America/Boa_Vista', 'America/Campo_Grande', 'America/Cuiaba', 'America/Eirunepe', 'America/Fortaleza', 'America/Maceio', 'America/Manaus', 'America/Recife', 'America/Sao_Paulo'];

MIN_COUNT = 10;

eventExceptions = {
  fetchable: {
    name: 'cantFetch',
    passes: function(data) {
      return !data.error;
    },
    data_attr: 'error',
    silent: true
  },
  isEvent: {
    name: 'invalidObject',
    passes: function(data) {
      return data.metadata.type === 'event';
    },
    silent: true
  },
  locatable: {
    name: 'cannotLocate',
    passes: function(data) {
      return data.location;
    },
    silent: true,
    data_attr: 'location'
  },
  notOutdated: {
    name: 'eventIsOutdated',
    passes: function(data) {
      return new Date() < new Date(data.start_time);
    },
    data_attr: 'start_time',
    silent: true
  },
  withinTwoMonths: {
    name: 'dateTooDistant',
    passes: function(data) {
      return new Date(data.start_time) < new Date(2014, 2);
    },
    data_attr: 'start_time',
    silent: true
  },
  validTimezone: {
    name: 'invalidTmz',
    passes: function(data) {
      var _ref;
      return !data.timezone || (_ref = data.timezone, __indexOf.call(VALID_TMZs, _ref) >= 0);
    },
    data_attr: 'timezone',
    silent: true
  },
  bigEnough10: {
    name: 'eventTooSmall',
    passes: function(data) {
      return data.count > MIN_COUNT;
    },
    data_attr: 'count',
    silent: true
  },
  bigEnough30: {
    name: 'eventTooSmall',
    passes: function(data) {
      return data.count > 30;
    },
    data_attr: 'count',
    silent: true
  },
  isntSPAM: {
    name: 'isSPAM',
    passes: function(data) {
      return !/serasa|SERASA|FORMATURA|formatura/.test(data.name);
    },
    data_attr: 'name'
  },
  notBlocked: {
    name: 'notBlocked',
    passes: function(data) {
      var _ref;
      return _ref = data.id, __indexOf.call(BLOCKED_IDS, _ref) < 0;
    },
    data_attr: 'id',
    silent: false
  }
};

fbEventValidator = createValidator(eventExceptions);

notNull = function(v) {
  return v !== null && v !== void 0;
};

notOver = function(v) {
  return true || new Date() < new Date(v);
};

EventSchema = new mongoose.Schema({
  id: Number,
  name: String,
  location: String,
  lat: {
    type: Number,
    validate: [notNull, 'cannotLocate']
  },
  lng: {
    type: Number,
    validate: [notNull, 'cannotLocate']
  },
  start_time: {
    type: Date,
    validate: [notOver, 'eventIsOutdated']
  },
  end_time: Date,
  description: {
    type: String,
    "default": ''
  },
  timesAdded: {
    type: Number,
    "default": 0
  },
  reviewed: {
    type: Boolean,
    "default": false
  },
  isUserInput: {
    type: Boolean,
    "default": true
  },
  count: {
    type: Number,
    "default": 0
  },
  urlTemplate: {
    type: String,
    "default": 'http://facebook.com/events/{id}'
  }
}, {
  id: false,
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

EventSchema.virtual('facebookUrl').get(function() {
  return 'http://facebook.com/events/' + this.id;
});

EventSchema.virtual('url').get(function() {
  return 'http://vempraruavem.org/#events/' + this.id;
});

toFbObject = function(data) {
  var _ref;
  return {
    id: data.id,
    name: data.name,
    location: data.location,
    lat: data.venue.latitude,
    lng: data.venue.longitude,
    start_time: data.start_time,
    description: (_ref = data.description) != null ? _ref.slice(0, 300) : void 0,
    count: data.count
  };
};

/*
A wrapper around calls to facebook API.
*/


fbRequester = (function() {
  var doFbRequest;
  doFbRequest = function(file, qs, cb, loggable) {
    if (loggable == null) {
      loggable = false;
    }
    return request.get({
      url: 'https://graph.facebook.com/' + file,
      json: true,
      qs: qs
    }, function(err, res, body) {
      if (loggable) {
        log('Path reached', res.request.uri.host + res.request.uri.pathname);
      }
      return cb.apply(cb, arguments);
    });
  };
  return {
    getEventCount: function(id) {
      var d;
      d = new RequestDeferer().validate(fbEventValidator('fetchable'));
      doFbRequest(id + '/attending', {
        access_token: process.env.facebook_app_access_token,
        summary: 1
      }, (function(err, res, data) {
        return d.resolve(err, data);
      }));
      return d;
    },
    /*
    		The process of fetching the desired information about a facebook event, given it's id,
    		envolves two requests: the one to get the basic info (from graph.facebook.com/{eventId}),
    		and one to get the count of people going to the event (information not visible right away
    		- why the fuck not, facebook!? - that you get in the body of a request like
    		graph.facebook.com/{eventId}/attending?summary=1).
    */

    getEvent: function(id) {
      var d, hasError;
      hasError = d = new RequestDeferer().validate(fbEventValidator('fetchable', 'isEvent', 'locatable'));
      doFbRequest(id, {
        access_token: process.env.facebook_app_access_token,
        metadata: 1
      }, function(err, res, body) {
        return doFbRequest(id + '/attending', {
          access_token: process.env.facebook_app_access_token,
          summary: 1
        }, function(e, r, countBody) {
          var _ref;
          return d.resolve(err || e, _.extend(body, {
            count: countBody != null ? (_ref = countBody.summary) != null ? _ref.count : void 0 : void 0
          }));
        });
      }, true);
      return d;
    },
    getIdsOfEventsWithTag: function(tag, access_token) {
      var d;
      d = new RequestDeferer().validate(fbEventValidator('fetchable'));
      doFbRequest('search', {
        type: 'event',
        q: tag,
        fields: 'id',
        access_token: access_token
      }, (function(err, res, data) {
        return d.resolve(err, data);
      }));
      return d;
    }
  };
})();

/*
A wrapper around calls to google maps API.
*/


gMapsRequester = (function() {
  /*
  	Tries to return the coordinates of a given location, using google's geocoding service.
  	@param location {String} 	The location to be sought.
  	@param callback {Function} 	The callback function to be executed with args[err, results]
  	This should be called the least number of times possible.
  */

  var doMapsRequest;
  doMapsRequest = function(location, cb, loggable) {
    if (loggable == null) {
      loggable = false;
    }
    return request.get({
      url: 'http://maps.google.com/maps/api/geocode/json',
      json: true,
      qs: {
        address: location,
        sensor: true
      }
    }, function(err, res, body) {
      if (loggable) {
        log('Path reached', res.request.uri.host + res.request.uri.pathname);
      }
      return cb.apply(cb, arguments);
    });
  };
  return {
    getValidCoord: function(location) {
      var d;
      d = new RequestDeferer();
      doMapsRequest(location, function(err, res, data) {
        var addr, results, _i, _ref, _ref1;
        if (data.status !== 'OK') {
          return d.resolve({
            name: 'maps_notOK'
          });
        }
        results = data.results;
        if (err || _.size(results) > 1) {
          return d.resolve(_.extend(eventExceptions.locatable, {
            '_attr': location
          }));
        }
        _ref = results != null ? results[0].address_components : void 0;
        for (_i = _ref.length - 1; _i >= 0; _i += -1) {
          addr = _ref[_i];
          if (__indexOf.call(addr.types, 'country') >= 0) {
            if ((_ref1 = addr.short_name) === 'BR') {
              return d.resolve(null, [results[0].geometry.location.lat, results[0].geometry.location.lng]);
            } else {
              break;
            }
          }
        }
        return d.resolve({
          name: 'maps_notBrazil'
        });
      }, false);
      return d;
    }
  };
})();

genericErrorHandler = function(callback) {
  return function(err) {
    if (!err._silent) {
      log('err', err);
    }
    return callback(err);
  };
};

/*
Search for tag on Facebook and add valid events.
@param tag {String}				Tag to search for.
@param access_token {String} 	Access token to be used in the request to Facebook.
*/


EventSchema.statics.crawlAndAdd = function(tag, access_token, callback) {
  var onGetIds,
    _this = this;
  onGetIds = function(body) {
    if (body.data.length === 0) {
      return callback(null, []);
    }
    return async.map(body.data, (function(event, next) {
      var onGetValidEvent,
        _this = this;
      onGetValidEvent = function(obj) {
        var addAlready, onGetValidMapsCoord;
        console.log("find event", obj);
        addAlready = function(fbObj) {
          fbObj.isUserInput = false;
          return _this.findOrCreate({
            id: obj.id
          }, fbObj, function(err, result, isNew) {
            return next(err, result);
          });
        };
        if (obj.venue && obj.venue.latitude) {
          return addAlready(toFbObject(obj));
        } else {
          console.assert(obj.location);
          onGetValidMapsCoord = function(coord) {
            obj.venue.latitude = coord[0], obj.venue.longitude = coord[1];
            return addAlready(toFbObject(obj));
          };
          return gMapsRequester.getValidCoord(obj.location).done(onGetValidMapsCoord).fail(function(err) {
            return next();
          });
        }
      };
      return fbRequester.getEvent(event.id, access_token).validate(fbEventValidator('validTimezone', 'notOutdated', 'withinTwoMonths', 'bigEnough30', 'isntSPAM', 'notBlocked')).done(onGetValidEvent).fail(genericErrorHandler(function(err) {
        return next();
      }));
    }), callback);
  };
  return fbRequester.getIdsOfEventsWithTag(tag, access_token).done(onGetIds).fail(genericErrorHandler(function(err) {
    console.log('no ids', err);
    return callback(err);
  }));
};

/*
Return a fbObject (not an Event!) given a facebook Id of a valid event (aka: with valid location,
count, description etc).
*/


EventSchema.statics.getValidEventFromFb = function(eventId, callback) {
  var onGetEventInfo,
    _this = this;
  log("Asked to getValidEventFromFb: " + eventId);
  onGetEventInfo = function(obj) {
    var e, fbObj, onGetValidMapsCoord;
    if (!obj.venue.latitude) {
      if (obj.count < 20) {
        return callback(eventExceptions.locatable);
      }
      onGetValidMapsCoord = function(result) {
        var e, fbObj;
        obj.venue.latitude = result[0], obj.venue.longitude = result[1];
        try {
          fbObj = toFbObject(obj);
        } catch (_error) {
          e = _error;
          return callback({
            message: 'Wrong object.',
            name: 'wrongInput'
          });
        }
        return callback(null, fbObj);
      };
      return gMapsRequester.getValidCoord(obj.location).done(onGetValidMapsCoord).fail(function() {
        return callback(_.extend(eventExceptions.locatable, {
          '_attr': obj.location
        }));
      });
    } else {
      try {
        fbObj = toFbObject(obj);
      } catch (_error) {
        e = _error;
        return callback({
          message: 'Wrong object.',
          name: 'wrongInput'
        });
      }
      return callback(null, fbObj);
    }
  };
  return fbRequester.getEvent(eventId).validate(fbEventValidator('notOutdated', 'withinTwoMonths', 'bigEnough10')).done(onGetEventInfo).fail(genericErrorHandler(callback));
};

/*
Create an Event object from its Facebook id.
*/


EventSchema.statics.createFromFBId = function(eventId, callback) {
  var _this = this;
  return this.findOne({
    id: eventId
  }, function(err, doc) {
    var onFetchObject;
    if (false) {
      doc.reFetch();
      return callback(null, doc, false);
    }
    onFetchObject = function(err, obj) {
      var onFoundOrCreated;
      console.log('cacete', err);
      if (err) {
        return callback(err);
      }
      onFoundOrCreated = function(err, obj, isNew) {
        var key, value, _ref;
        if (err) {
          if (err.name === 'ValidationError') {
            _ref = err.errors;
            for (key in _ref) {
              value = _ref[key];
              return callback({
                message: "Erro de validação.",
                name: value.type
              });
            }
          } else {
            return callback(err);
          }
        }
        return callback.apply(_this, arguments);
      };
      return _this.findOrCreate({
        id: obj.id
      }, _.extend(obj, {
        reviewed: true
      }), {
        upsert: true
      }, onFoundOrCreated);
    };
    return _this.getValidEventFromFb(eventId, onFetchObject);
  });
};

/*
Fetch all events in the database from Facebook again.
*/


EventSchema.statics.reFetchAll = function(callback) {
  return this.find({}, function(err, docs) {
    var count, results;
    if (err) {
      return typeof callback === "function" ? callback(err) : void 0;
    }
    count = docs.length;
    results = [];
    return _.each(docs, function(doc) {
      return doc.reFetch(function(err) {
        if (err) {
          if ((err != null ? err.name : void 0) === "cantFetch") {
            log('cantFetch', doc.id, doc.name);
            doc.remove();
          } else {
            log('error', err);
          }
        } else {
          log('200', doc.id, doc.name);
          results.push(doc);
        }
        if (!--count) {
          return typeof callback === "function" ? callback(null, results) : void 0;
        }
      });
    });
  });
};

/*
reFetches the object from Facebook.
*/


EventSchema.methods.reFetch = function(callback) {
  var onCantGetEventInfo, onGetEventInfo,
    _this = this;
  if (callback == null) {
    callback = function() {};
  }
  onCantGetEventInfo = function(err) {
    return genericErrorHandler(callback).apply(this, arguments);
  };
  onGetEventInfo = function(obj) {
    var updateAlready;
    if (obj.count !== _this.count) {
      log("COUNT_CHANGED " + obj.id + ":" + obj.name + ". " + _this.count + " → " + obj.count);
    }
    updateAlready = function(obj, location) {
      var data;
      if (location == null) {
        location = {};
      }
      data = _.extend(location, {
        name: obj.name,
        count: obj.count,
        start_time: obj.start_time,
        description: obj.description || ''
      });
      return _this.update(data, function(err, num) {
        if (err) {
          log("ERROR_WITH_DATA " + obj.id + ":" + obj.name + " ", data, err);
        }
        return callback(err, _this);
      });
    };
    if (obj.location !== _this.location && obj.venue.latitude !== _this.lat) {
      log("LOCATION_CHANGED " + obj.id + ":" + obj.name);
      return gMapsRequester.getValidCoord(obj.location).done(function(c) {
        return updateAlready(obj, {
          lat: c[0],
          lng: c[1]
        });
      }).fail(function() {
        log("GMAP_ERROR " + obj.id + ":" + obj.name);
        return found.dec();
      });
    } else {
      return updateAlready(obj);
    }
  };
  return fbRequester.getEvent(this.id).validate(fbEventValidator('notOutdated', 'withinTwoMonths', 'validTimezone')).done(onGetEventInfo).fail(genericErrorHandler(callback));
};

BannedEventsSchema = new mongoose.Schema({
  id: String,
  start_time: Date
}, {
  id: false
});

BannedEventsSchema.statics.findOrCreate = findOrCreate;

EventSchema.statics.Blocked = mongoose.model("Blocked", BannedEventsSchema);

BLOCKED_IDS = [];

EventSchema.statics.blockAndRemove = function(obj, callback) {
  return EventSchema.statics.Blocked.findOrCreate({
    id: obj.id
  }, function(err, doc) {
    doc.start_time = obj.start_time;
    doc.save();
    return Event.remove({
      id: obj.id
    }, function(err2) {
      Event.flushCache();
      EventSchema.statics.Blocked.find({}, function(err, all) {
        var o;
        return BLOCKED_IDS = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = all.length; _i < _len; _i++) {
            o = all[_i];
            _results.push(o.id);
          }
          return _results;
        })();
      });
      return callback(err || err2);
    });
  });
};

EventSchema.statics.Blocked.find({}, function(err, all) {
  var o;
  return BLOCKED_IDS = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = all.length; _i < _len; _i++) {
      o = all[_i];
      _results.push(o.id);
    }
    return _results;
  })();
});

EventSchema.statics.findOrCreate = findOrCreate;

EventSchema.statics.getCached = function(cb) {
  var mc;
  mc = memjs.Client.create();
  return mc.get('events', function(err, val, key) {
    var ret;
    if (err) {
      console.warn('Cache error:', err);
      this.find({
        start_time: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }, cb);
      ret = [];
    } else if (val === null) {
      console.warn('Cache query for events returned null.');
      ret = [];
    } else {
      ret = JSON.parse(val.toString());
    }
    return cb(null, ret);
  });
};

EventSchema.statics.flushCache = function(cb) {
  var mc;
  mc = memjs.Client.create();
  console.log('Flushing cached events.');
  return this.find({
    start_time: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0))
    }
  }, function(err, events) {
    return mc.set('events', JSON.stringify(events), cb);
  });
};

Event = mongoose.model("Event", EventSchema);

module.exports = Event;
