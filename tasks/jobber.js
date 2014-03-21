
/* jobber.js
* A wrapper for jobs. Repeat after me:
- This is not a library.
- This is not a library.
- This is not a library.
- I swear not to try to make this into a library. */

module.exports = function (job, options) {
	
	var standalone = (module.parent === require.main);

	var requirable = options?((typeof options === 'string')?options:options.requirable):false;
	if (!standalone && !requirable)
		throw "This module is supposed to be executed as a job.";

	var mongoose = require('mongoose');
	var start = function () {		
		// If being executed directly...
		// > load keys
		try {
			require('../src/env.js')
		} catch (e) {}

		// Open database.
		mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/madb'
		mongoose.connect(mongoUri)

		job({
			// To be called by user at the end of function.
			quit: function (err) {
				console.log("Process (pid="+process.pid+") terminated. Error:", err)
				// Close database at the end.
				// Otherwise, the script won't close.
				mongoose.connection.close()
				process.exit(!!err)
			},
			// Simple 'continue? [y/n]' utility.
			checkContinue: function checkContinue (onContinue) {
				process.stdout.write('Continue [Y/n]? ')
				var stdin = process.openStdin();
				stdin.on('data', function (chunk) {
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