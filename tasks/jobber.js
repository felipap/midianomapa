
/* jobber.js
* A wrapper for jobs. Repeat after me:
- This is not a library.
- This is not a library.
- This is not a library.
- I swear not to try making this into a library. */

require('coffee-script/register');

require('colors');
var path = require('path');
var mongoose = require('mongoose');

// Absolute imports.
// See https://gist.github.com/branneman/8048520#6-the-hack
process.env.NODE_PATH = path.join(__dirname,'../');
require('module').Module._initPaths();

var nconf = require('src/config/nconf');

var logger = global.logger = require('src/config/bunyan')()
logger.level(nconf.get('BUNYAN_LVL') || 'debug');

module.exports = function (job, options) {

	var standalone = (module.parent === require.main);

	function log () {
		if (verbose)
			console.log.apply(console, arguments)
	}

	var verbose = (options && options.verbose) || true;
	var requirable = options?((typeof options === 'string')?options:options.requirable):false;
	if (!standalone && !requirable)
		throw "This module is supposed to be executed as a job.";

	var parentFile = path.basename(module.parent.filename);

	var start = function () {

		log(('Jobber: Requiring environment keys.').green);

		// Open database.
		log(('Jobber: Opening database configuration file.').green);
		require('src/config/mongoose.js')();

		log(('Jobber: Calling job on file '+parentFile).green);

		console.time('jobTime');

		var quitCalled = 0;
		job({
			// To be called by user at the end of function.
			quit: function (err) {
				if (quitCalled) {
					console.log(('Quit called for the '+quitCalled+'-th time.').red);
					quitCalled += 1;
				}
				quitCalled = 1;
				console.timeEnd('jobTime');
				if (err) {
					console.log(("Jobber: Process (pid="+process.pid+") terminated with err:").red, err)
				} else {
					console.log(("Jobber: Process (pid="+process.pid+") terminated.").green)
				}
				// Close database at the end.
				// Otherwise, the script won't close.
				mongoose.connection.close()
				process.exit(!!err)
			},
			// Simple 'continue? [y/n]' utility.
			checkContinue: function checkContinue (onContinue) {
				process.stdout.write('Continue [Y/n]? ')
				var stdin = process.openStdin();
				stdin.once('data', function (chunk) {
					var input = chunk.toString();
					if (input === '\n' || input === 'y\n' || input.toLowerCase() === 'yes\n') {
						onContinue();
					} else { // (input === 'n\n' || input.toLowerCase() === 'no\n') {
						console.log("Aborting process (pid="+process.pid+").");
						// Close database at the end.
						// Otherwise, the script won't close.
						mongoose.connection.close();
						process.exit(0);
					}
				});
			}
		})
	};

	return {start: start};
}