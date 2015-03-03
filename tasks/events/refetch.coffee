
# events/refetch.coffee
# Wrapper around Event.reFetchAll.

mongoose = require('mongoose')

jobber = require('../jobber.js')((e) ->
	console.log('Starting to fetch all events.')
	Event = mongoose.model 'Event'
	Event.reFetchAll (err, results) ->
		console.log("Events refetched and maintaned: #{results.length}")
		Event.flushCache (err2) ->
			e.quit(err or err2)
).start()