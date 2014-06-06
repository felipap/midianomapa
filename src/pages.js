/*
# pages.coffee
# for vempraruavem.org
# Copyright 2014, by @f03lipe
*/

var Event, Events, Ninja, Ninjas, Pages, async, request, stats, translt, _;

_ = require('underscore');

request = require('request');

async = require('async');

Event = require('./models/event.js');

Ninja = require('./models/ninja.js');

stats = {};

Event.flushCache(function(err, success) {
  return Event.getCached(function(err, docs) {
    return stats.events = docs.length;
  });
});

Ninja.flushCache(function(err, success) {
  return Ninja.getCached(function(err, docs) {
    return stats.ninjas = docs.length;
  });
});

Pages = {
  index_get: function(req, res) {
    console.log("Sending stats:", stats);
    return res.render('index', {
      isMe: process.env.myself && (req.query.m === process.env.myself),
      stats: stats
    });
  }
};

Ninjas = {
  login_get: function(req, res) {
    if (typeof req.logout === "function") {
      req.logout();
    }
    return res.render('login');
  },
  logout_get: function(req, res) {
    req.user.lat = null;
    req.user.lng = null;
    req.user.isLive = false;
    req.user.save(function() {});
    Ninja.flushCache();
    req.logout();
    return res.redirect('/');
  },
  get: function(req, res) {
    if (req.query.all != null) {
      return Ninja.find({}, function(err, ninjas) {
        return res.end(JSON.stringify(ninjas));
      });
    } else {
      return Ninja.getCached(function(err, ninjas) {
        if (err) {
          console.warn('Couldn\´t get ninjas', err);
          return res.status(500).end();
        }
        return res.end(JSON.stringify(ninjas));
      });
    }
  },
  panel_get: function(req, res) {
    if (req.user.firstAccess.valueOf() === req.user.lastAccess.valueOf()) {
      req.flash('success', "Olá! Esse é o seu painel de controle.");
    }
    return req.user.updateLiveStatus(function(err) {
      if (err) {
        console.log(err);
        req.flash('error', err.message || "Ops! Detectamos algum erro aqui...");
      }
      return res.render('panel', {
        ninja: req.user,
        page_title: req.user.isLive ? '' + req.user.id + ' está ao vivo' : void 0,
        messages: req.flash()
      });
    });
  },
  iamhere: function(req, res) {
    if (!req.user) {
      res.status(401).end();
    }
    req.user.lat = parseFloat(req.body.lat);
    req.user.lng = parseFloat(req.body.lng);
    req.user.lastSave = new Date();
    req.user.lastAccess = req.user.lastSave;
    return req.user.save(function() {
      Ninja.flushCache();
      return res.status(200).end(JSON.stringify({
        ends: req.user.getTimeout()
      }));
    });
  },
  remove: function(req, res) {
    return Ninja.remove({
      socialid: req.params.socialid
    }, function(err, nAffected) {
      Ninja.flushCache();
      return res.end("Removed {id:" + req.params.id + "}? Num deleted: " + nAffected + ". Err: " + err + ".");
    });
  }
};

translt = {
  'cantFetch': 'Parece que esse evento não é público ou não existe.',
  'wrongInput': 'Essa não é uma url válida, é? ;)',
  'invalidObject': 'Tem certeza que esse é o link de um evento do Facebook?',
  'eventIsOutdated': 'Esse evento já aconteceu! :(',
  'cannotLocate': function(err) {
    var title;
    if (err._attr) {
      title = "Não conseguimos localizar \'" + err._attr + "\' evento no mapa.";
    } else {
      title = 'Não conseguimos localizar esse evento no mapa.';
    }
    return title + (":(<i class=\"fa fa-question-circle\" onMouseOver=\"$(this).tooltip(\'show\')\" data-html=\"true\" title=\"" + title + "\"></i>");
  },
  'dateTooDistant': 'Ainda falta muito tempo para esse evento...'
};

Events = {
  get: function(req, res) {
    return Event.getCached(function(err, events) {
      if (err) {
        console.warn('Couldn\´t get events', err);
        return res.status(500).end();
      }
      return res.end(JSON.stringify(events));
    });
  },
  put: function(req, res) {
    return Event.createFromFBId(req.body.id, function(err, obj, isNew) {
      var message;
      if (err) {
        console.log(err);
        switch (typeof translt[err.name]) {
          case 'undefined':
            message = err.message || 'Algum erro ocorreu.';
            break;
          case 'string':
            message = translt[err.name];
            break;
          case 'function':
            message = translt[err.name](err);
        }
        return res.status(400).end(JSON.stringify({
          error: true,
          message: message
        }));
      } else {
        Event.flushCache();
        obj = obj.toJSON();
        obj.isNew = isNew;
        return res.end(JSON.stringify(obj));
      }
    });
  },
  block: function(req, res) {
    if (req.params.id) {
      return Event.findOne({
        id: req.params.id
      }, function(err, obj) {
        console.log(err);
        if (obj) {
          return Event.blockAndRemove(obj, function(err) {
            return res.end("Block {id:" + req.params.id + "}? Err: " + err + ".");
          });
        } else {
          return res.end("Block {id:" + req.params.id + "}? Not found.");
        }
      });
    } else {
      return res.end();
    }
  },
  review: function(req, res) {
    return Event.update({
      id: req.params.id
    }, {
      reviewed: true
    }, function(err, nAffected) {
      return res.end("Updated {id:" + req.params.id + "}? Num affected: " + nAffected + ". Err: " + err + ".");
    });
  },
  reset: function(req, res) {
    return Event.remove({}, function(err, num) {
      Event.flushCache();
      return res.end(JSON.stringify({
        err: err,
        count: num
      }));
    });
  },
  search_get: function(req, res) {
    var access_token, tags;
    access_token = req.query.access_token || '';
    tags = ['passeata', 'protesto', 'manifestação', 'ato+apoio', 'ato+contra', 'ato+em', 'mobilização+contra'];
    res.connection.setTimeout(0);
    return async.map(tags, (function(tag, next) {
      return Event.crawlAndAdd(tag, access_token, function(err, docs) {
        if (err && err.name === 'cantFetch') {
          return next(err);
        } else if (err) {
          return next(null, {
            tag: tag,
            err: err
          });
        } else {
          return next(null, {
            tag: tag,
            count: docs.length,
            results: docs
          });
        }
      });
    }), function(err, results) {
      if (err) {
        return res.status(400).end('{"message":"You sure that token is still good?"}');
      } else {
        Event.flushCache();
        return res.end(JSON.stringify(results));
      }
    });
  }
};

module.exports = {
  Pages: Pages,
  Events: Events,
  Ninjas: Ninjas
};
