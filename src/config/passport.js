
// config/passport.js
// for vempraruavem.org, @f03lipe

var passport = require('passport');

var Ninja = require('../models/ninja.js');
var pages = require('../pages.js');

var getErrorMessage = function (type) {
	return {
		'noTwitCasting': 'Ops! Não encontramos nenhum usuário do TwitCasting associado a essa conta do Twitter.',
//		'500twitCasting': ''
	}[type] || 'Estou sentindo uma treta.';
};

function setUpPassport(app) {
	passport.use(new (require('passport-facebook').Strategy)({
			clientID: process.env.facebook_app_id,
			clientSecret: process.env.facebook_secret,
			callbackURL: "/auth/facebook/callback"
		},
		function(token, tokenSecret, profile, done) {
			Ninja.createFromFacebookProfile(profile, function (err, ninja) {
				console.log('error:', err)
				if (err)
					done(null, false, getErrorMessage(err.type))
				else
					done(null, ninja);
			});
		}
	));
	
	passport.use(new (require('passport-twitter').Strategy)({
			consumerKey: process.env.twitter_consumer_key,
			consumerSecret: process.env.twitter_consumer_secret,
			callbackURL: "/auth/twitter/callback"
		},
		function(token, tokenSecret, profile, done) {
			Ninja.createFromTwitterProfile(profile, function (err, ninja) {
				if (err)
					done(null, false, getErrorMessage(err.type))
				else
					done(null, ninja);
			});
		}
	));

	passport.serializeUser(function (user, done) {
		return done(null, user._id);
	});

	passport.deserializeUser(function (id, done) {
		Ninja.findOne({_id: id}, function (err, user) {
			return done(err, user);
		});
	})
}

module.exports = setUpPassport