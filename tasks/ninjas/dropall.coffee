
# ninjas/dropall.coffee

jobber = require('../jobber.js')((e) ->
	console.log("About to drop all ninjas.")
	e.checkContinue ->
		Ninja = require('../../src/models/ninja.js')
		Ninja.remove {}, (err, count) ->
			console.log("Count affected: #{count}.")
			Ninja.flushCache (err2) ->
				e.quit(err or err2)
).start()