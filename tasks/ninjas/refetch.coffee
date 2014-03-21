
# ninjas/refetch.coffee
# Refetches ninjas from streaming services APIs. What else did you expect it to do? Cake?

jobber = require('../jobber.js')((e) ->
	console.log('Starting to refetch ninjas.')
	Ninja = require('../../src/models/ninja.js')
	Ninja.updateAll (err) ->
		Ninja.flushCache (err2) ->
			e.quit(err or err2)
).start()