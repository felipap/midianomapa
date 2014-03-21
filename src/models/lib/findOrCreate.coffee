
# Creates and object if it's not there already, else updates.
# Customized from https://github.com/drudge/mongoose-findorcreate

_ = require('underscore')

module.exports = (conditions, doc, options, callback) ->
	if arguments.length < 4
		if typeof options is 'function' # Scenario: findOrCreate(conditions, doc, callback)
			callback = options
			options = {}
		else if typeof doc is 'function' # Scenario: findOrCreate(conditions, callback)
			callback = doc
			doc = {}
			options = {}
	
	@findOne conditions, (err, result) =>
		if err or result
			if options and options.upsert and not err
				console.log "Object already here, so updating.", conditions
				@update conditions, doc, (err, count) =>
					if err then return callback err
					@findOne conditions, (err, result) =>
						callback(err, result, false)
			else
				callback err, result, false
		else
			_.extend conditions, doc
			@create conditions, (err, obj) -> 
				callback err, obj, true