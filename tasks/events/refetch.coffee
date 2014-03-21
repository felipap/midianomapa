
# events/refetch.coffee
# Wrapper around Event.reFetchAll.

jobber = require('../jobber.js')((e) ->
	console.log('Starting to fetch all events.')
	Event = require('../../src/models/event.js')
	Event.reFetchAll (err, results) ->
		console.log("Events refetched and maintaned: #{results.length}")
		Event.flushCache (err2) ->
			e.quit(err or err2)
).start()