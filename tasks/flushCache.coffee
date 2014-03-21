
# refetchEvents.coffee
# This is a job. It fetches all events from Facebook again, to make then updated.

if module is require.main
	# If being executed directly...
	# > load keys
	try require('../src/env.js') catch e
	# > open database
	mongoose = require 'mongoose'
	mongoUri = process.env.MONGOLAB_URI or process.env.MONGOHQ_URL or 'mongodb://localhost/madb'
	mongoose.connect(mongoUri)
	# ready to go

	exit = (err) ->
		console.log("Process terminated. No check for errors.")
		# Close database at the end.
		# Otherwise, the script won't close.
		mongoose.connection.close()
		process.exit(0)
		
	console.log('Starting to fetch all events.')
	count = 2
	require('../src/models/ninja.js').flushCache ->
		if -count <= 0 then exit()
	require('../src/models/event.js').flushCache ->
		if --count <= 0 then exit()
		
else
	throw "This module is supposed to be executed as a job."