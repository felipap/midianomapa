// apps.js
// for vempraruavem.org, by @f03lipe

// This is the main script.
// Set up everything.

// Attempt to import environment keys (if on production)
try { require('./env.js') } catch (e) {}

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/madb');

var flash = require('connect-flash');
var passport = require('passport');
var connect = require('connect');
var helmet = require('helmet');

var express = require('express'),
	app = module.exports = express();

require('./config/passport.js')();

app.set('view engine', 'html'); // make '.html' the default
app.set('views', __dirname + '/views'); // set views for error and 404 pages
app.set('view options', {layout: false}); // disable layout
app.set('view cache', true);
app.engine('html', require('ejs-locals'))
app.use(helmet.csp())
app.use(helmet.xframe('deny'))
app.use(helmet.contentTypeOptions())
app.use(helmet.defaults())

app.use(connect.compress());

app.use(express.static(__dirname + '/static/robots.txt'))
app.use(express.static(__dirname + '/static/people.txt'))
app.use(express.favicon(__dirname + '/static/favicon.ico'))

if (app.get('env') === 'production') {
	app.use(express.logger());
}

app.use(express.methodOverride()); // support _method (PUT in forms etc)
app.use(express.bodyParser()); // parse request bodies (req.body)
app.use('/static', express.static(__dirname + '/static')); // serve static files
app.use(express.cookieParser()); // support cookies
app.use(express.session({
	secret: process.env.SESSION_SECRET || 'mysecret',
	maxAge: new Date(Date.now() + 3600000),
	store: 	new (require('connect-mongo')(express))({ mongoose_connection: mongoose.connection })
}));
app.use(express.csrf());
app.use(function(req, res, 
	next){ res.locals.token = req.session._csrf; next(); });
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
	res.locals.messages = req.flash();
	next();
});

if (app.get('env') === 'development') {
	app.use(express.logger());
}

app.use(app.router);
// app.use('/', express.static(__dirname + '/static')); // serve static files from root (put after router)

app.locals.errors = {};
app.locals.message = {};
app.locals.tags = {};

require('./routes.js')(app);

if (app.get('env') === 'development') {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	app.locals.pretty = false;
}

var server = require('http')
				.createServer(app)
				.listen(process.env.PORT || 3000, function () {
	console.log('Server on port %d in %s mode', server.address().port, app.settings.env);
});