
# ninjas/remove.coffee

jobber = require('../jobber.js')((e) ->
	console.log("Removing ninja {id:#{process.argv[2]}}.")
	Ninja = require('../../src/models/ninja.js')
	Ninja.remove {id: process.argv[2]}, (err, count) ->
		console.log("Count affected: #{count}.")
		Ninja.flushCache (err2) ->
			e.quit(err or err2)
).start()