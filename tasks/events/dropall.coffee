
# events/dropall.coffee

jobber = require('../jobber.js')((e) ->
	console.log("About to drop all events.")
	e.checkContinue ->
		Event = require('../../src/models/event.js')
		Event.remove {}, (err, count) ->
			console.log("Count affected: #{count}.")
			Event.flushCache (err2) ->
				e.quit(err or err2)
).start()