
// routes.js
// for vempraruavem.org, by @f03lipe

var pages = require('./pages.js');
var passport = require('passport');

module.exports = function (app) {

	function isMeOr403 (req, res, next) {
		if (app.get('env') !== 'development') {
			if (req.query.m && process.env.myself && req.query.m === process.env.myself) {
				return next();
			} else {
				return res.status(403).end("Cannot GET "+req.url);
			}
		} else {
			return next();
		}
	}

	function validateWithRegex(regex) {
		return function (req, res, next, value) {
			if (regex.test(value))
				next();
			else
				next('route');
		}
	}

	function requireLogged (req, res, next) {
		if (arguments.length === 1) {
			var url = req;
			return function (req,res,next) {			
				if (!req.user)
					return res.redirect(url);
				next();
			}
		} else {
			if (!req.user)
				return res.redirect('/ninja');
			next();
		}
	}

	app.get('/', pages.Pages.index_get);

	app.get('/ninja', pages.Ninjas.login_get);
	app.get('/logout', requireLogged, pages.Ninjas.logout_get);
	app.get('/panel', requireLogged, pages.Ninjas.panel_get);


	app.get('/api/ninjas', pages.Ninjas.get);
	app.post('/api/ninjas/iamhere', requireLogged, pages.Ninjas.iamhere);

	app.get('/api/events', pages.Events.get);
	app.put('/api/events', pages.Events.put);
	app.get('/api/events/block/:id', isMeOr403, pages.Events.block);
	app.get('/api/events/review/:id', isMeOr403, pages.Events.review);
	app.get('/api/events/search', isMeOr403, pages.Events.search_get);
	app.get('/api/events/reset', isMeOr403, pages.Events.reset);

	app.get('/auth/facebook', passport.authenticate('facebook'));
	app.get('/auth/facebook/callback', passport.authenticate('facebook',{successRedirect: '/panel', failureRedirect: '/login', failureFlash: true}));
	app.get('/auth/twitter', passport.authenticate('twitter'));
	app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/panel', failureRedirect: '/login', failureFlash: true}));
}