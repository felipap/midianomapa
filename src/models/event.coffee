
###
# models/event.coffee
# Event model.


Sample Facebook event.
reference: https://developers.facebook.com/docs/reference/api/event/
These fields are not always complete/existent.
{
	id: String
	owner:
		name: String
		id: String # the owner's Facebook userId
	name: String,
	description: String
	start_time: String # ISO-8601 formatted date/time
	timezone: String # IANA format (eg. Brazil/Acre)
	is_date_only: Boolean
	location: String
	venue: {
		latitude: Float
		longitude: Float
		city: String
		state: String
		country: String
		id: String
		street: String
		zip: String
	}
	privacy: String # 'OPEN', 'SECRET', 'FRIENDS'
	updated_time: String # ISO-8601 formatted date/time
}
###

mongoose = require 'mongoose'
request = require 'request'
crypto = require 'crypto'
memjs = require 'memjs'
async = require 'async'
_ = require 'underscore'

findOrCreate = require('./lib/findOrCreate')
RequestDeferer = require('./lib/deferer')
createValidator = require('./lib/validator')

log = _.bind(console.log, console)

### Configure program ###
SEARCH_N_ADD_MINCOUNT = 20

VALID_TMZs = [
	'Brazil/Acre','Brazil/West','Brazil/East','Brazil/Sao_Paulo','Brazil/Acre','Brazil/DeNoronha', 'America/Rio_Branco',
	'America/Noronha','America/Manaus','America/Porto_Velho','America/Santarem','America/Araguaiana','America/Bahia',
	'America/Belem','America/Boa_Vista','America/Campo_Grande','America/Cuiaba','America/Eirunepe','America/Fortaleza',
	'America/Maceio','America/Manaus','America/Recife','America/Sao_Paulo'
]

MIN_COUNT = 10


####################################################################################################
####################################################################################################

eventExceptions = {
	fetchable: {									# Generic error from Facebook.
		name: 'cantFetch'
		passes: (data) -> not data.error
		data_attr: 'error'
		silent: true
	}
	isEvent: { 										# Object isn't an event.
		name: 'invalidObject'
		passes: (data) -> data.metadata.type is 'event'
		silent: true
	}
	locatable: { 									# Object has no location attribute.
		name: 'cannotLocate'
		passes: (data) -> data.location
		silent: true
		data_attr: 'location'
	}
	notOutdated: {
		name: 'eventIsOutdated'
		passes: (data) ->new Date() < new Date(data.start_time)
		data_attr: 'start_time'
		silent: true
	}
	withinTwoMonths: {
		name: 'dateTooDistant'
		passes: (data) -> 1*(new Date(data.start_time)) < Date.now()+1000*60*60*24*60
		data_attr: 'start_time'
		silent: true
	}
	validTimezone: {
		name: 'invalidTmz'
		passes: (data) -> not data.timezone or data.timezone in VALID_TMZs
		data_attr: 'timezone'
		silent: true
	}
	bigEnough10: {
		name: 'eventTooSmall'
		passes: (data) -> data.count > MIN_COUNT
		data_attr: 'count'
		silent: true
	}
	bigEnough30: {
		name: 'eventTooSmall'
		passes: (data) -> data.count > 30
		data_attr: 'count'
		silent: true
	}
	isntSPAM: { 								# TODO Please please improve this
		name: 'isSPAM'
		passes: (data) -> not /serasa|SERASA|FORMATURA|formatura/.test(data.name)
		data_attr: 'name'
	}
	notBlocked: {
		name: 'notBlocked'
		passes: (data) -> data.id not in BLOCKED_IDS
		data_attr: 'id'
		silent: false
	}
}


fbEventValidator = createValidator(eventExceptions)


####################################################################################################
####################################################################################################
# Validation for EventSchema
notNull = (v) ->
	v isnt null and v isnt undefined

notOver = (v) -> # Check if event hasn't taken place yet.
	true or new Date() < new Date(v)

# Schema
EventSchema = new mongoose.Schema({
		id:					Number
		name: 				String
		location: 			String
		lat: 				{type: Number, validate: [notNull, 'cannotLocate']}
		lng: 				{type: Number, validate: [notNull, 'cannotLocate']}
		start_time: 		{type: Date, validate: [notOver, 'eventIsOutdated']}
		end_time: 			Date
		description:		{type: String, default: ''}
		timesAdded:			{type: Number, default: 0}
		reviewed: 			{type: Boolean, default: false}
		isUserInput: 		{type: Boolean, default: true}
		count: 				{type: Number, default: 0}
		urlTemplate: 		{type: String, default: 'http://facebook.com/events/{id}'}
	}, {
		id: false
		toObject: { virtuals: true }
		toJSON: { virtuals: true }
	})

####################################################################################################
####################################################################################################
# Virtuals
EventSchema.virtual('facebookUrl').get ->
	return 'http://facebook.com/events/'+@id


EventSchema.virtual('url').get ->
	return 'http://midianomapa.org/#events/'+@id

####################################################################################################
####################################################################################################

toFbObject = (data) ->
	return {
		id: 			data.id
		name: 			data.name
		location: 		data.location
		lat: 			data.venue.latitude
		lng: 			data.venue.longitude
		start_time: 	data.start_time
		description:	data.description?.slice(0,300)
		count: 			data.count
	}


####################################################################################################
####################################################################################################

###
A wrapper around calls to facebook API.
###
fbRequester = do ->

	doFbRequest = (file, qs, cb, loggable=false) ->
		return request.get(
			{url: 'https://graph.facebook.com/'+file, json: true, qs: qs},
			(err, res, body) ->
				if loggable
					log('Path reached', res.request.uri.host+res.request.uri.pathname)
				cb.apply(cb, arguments)
		)

	return {
		getEventCount: (id) ->
			d = new RequestDeferer()
					.validate(fbEventValidator('fetchable'))
			doFbRequest(id+'/attending',
				{access_token:process.env.facebook_app_access_token,summary:1},
				((err, res, data) -> d.resolve(err, data))
			)
			return d

		###
		The process of fetching the desired information about a facebook event, given it's id,
		envolves two requests: the one to get the basic info (from graph.facebook.com/{eventId}),
		and one to get the count of people going to the event (information not visible right away
		- why the fuck not, facebook!? - that you get in the body of a request like
		graph.facebook.com/{eventId}/attending?summary=1).
		###

		getEvent: (id) ->
			hasError =
			d = new RequestDeferer()
					.validate(fbEventValidator('fetchable','isEvent','locatable'))

			doFbRequest(id,
				{access_token:process.env.facebook_app_access_token,metadata:1},
				(err, res, body) ->
					# Request count of people going to this event.
					doFbRequest(id+'/attending',
						{access_token:process.env.facebook_app_access_token,summary:1},
						(e, r, countBody)->
							# Extend original body with count and deferrer.resolve(<arguments>).
							d.resolve(err or e, _.extend(body, {count: countBody?.summary?.count}))
					)
				, true
			)
			return d

		getIdsOfEventsWithTag: (tag, access_token) ->
			d = new RequestDeferer()
					.validate(fbEventValidator('fetchable'))

			doFbRequest('search', {
				type:'event', q:tag, fields: 'id',#,name,start_time,timezone,location,venue,description',
				access_token: access_token},
				((err, res, data) -> d.resolve(err, data)))

			return d
	}

###
A wrapper around calls to google maps API.
###
gMapsRequester = do ->

	###
	Tries to return the coordinates of a given location, using google's geocoding service.
	@param location {String} 	The location to be sought.
	@param callback {Function} 	The callback function to be executed with args[err, results]
	This should be called the least number of times possible.
	###
	doMapsRequest = (location, cb, loggable=false) ->
		return request.get({
			url: 'http://maps.google.com/maps/api/geocode/json', json:true,
			qs:{address:location,sensor:true}
			},
			(err, res, body) ->
				if loggable
					log('Path reached', res.request.uri.host+res.request.uri.pathname)
				cb.apply(cb, arguments)
		)

	return {

		getValidCoord: (location) ->
			d = new RequestDeferer()

			doMapsRequest(location,
				(err, res, data) ->
					if data.status isnt 'OK'
						return d.resolve({name:'maps_notOK'})
					results = data.results
					if err or _.size(results) > 1 # If multiple results, we can't locate.
						return d.resolve(_.extend(eventExceptions.locatable, {'_attr':location}))
					# See if it's in Brazil.
					for addr in results?[0].address_components by -1
						if 'country' in addr.types
							if addr.short_name in ['BR']#,'PT']
							# if true
								return d.resolve(null,
									[results[0].geometry.location.lat, results[0].geometry.location.lng])
							else break
					return d.resolve({name:'maps_notBrazil'})
				, false)
			return d
	}

####################################################################################################
####################################################################################################

genericErrorHandler = (callback) ->
	return (err) ->
		unless err._silent
			log('err', err)
		callback(err)

###
Search for tag on Facebook and add valid events.
@param tag {String}				Tag to search for.
@param access_token {String} 	Access token to be used in the request to Facebook.
###
EventSchema.statics.crawlAndAdd = (tag, access_token, callback) ->
	Event = @

	console.log('tag', tag)

	onGetIds = (body) =>
		if body.data.length is 0
			return callback(null,[])

		console.log('')

		async.map body.data, ((event, next) ->
			onGetValidEvent = (obj) =>
				addAlready = (fbObj) =>
					fbObj.isUserInput = false
					console.log('add already', !!Event.findOrCreate)
					Event.findOrCreate {id:obj.id}, fbObj, (err, result, isNew) ->
						next(err, result)

				if obj.venue and obj.venue.latitude
					addAlready(toFbObject(obj))
				else # assumes obj.location
					console.assert(obj.location)
					onGetValidMapsCoord = (coord) ->
						[obj.venue.latitude, obj.venue.longitude] = coord
						addAlready(toFbObject(obj))
					gMapsRequester.getValidCoord(obj.location)
						.done(onGetValidMapsCoord)
						.fail((err) -> next())

			fbRequester.getEvent(event.id, access_token)
				.validate(fbEventValidator('validTimezone','notOutdated','withinTwoMonths','bigEnough30','isntSPAM','notBlocked'))
				.done(onGetValidEvent)
				.fail(genericErrorHandler((err) -> (next())))
		), callback

	fbRequester.getIdsOfEventsWithTag(tag,access_token)
		.done(onGetIds)
		.fail(genericErrorHandler((err)->
			console.log('no ids', err)
			callback(err)))

###
Return a fbObject (not an Event!) given a facebook Id of a valid event (aka: with valid location,
count, description etc).
###
EventSchema.statics.getValidEventFromFb = (eventId, callback) ->
	log("Asked to getValidEventFromFb: #{eventId}")

	onGetEventInfo = (obj) =>
		if not obj.venue.latitude
			if obj.count < 20 # Too small to spend a Gmaps call with it.
				return callback(eventExceptions.locatable)

			# If object has no coordinates, try to get it using Google Maps geolocation service.
			onGetValidMapsCoord = (result) ->
				[obj.venue.latitude, obj.venue.longitude] = result
				try fbObj = toFbObject(obj)
				catch e
					return callback(message:'Wrong object.', name:'wrongInput')
				return callback(null, fbObj)

			gMapsRequester.getValidCoord(obj.location)
				.done(onGetValidMapsCoord)
				.fail(->callback(_.extend(eventExceptions.locatable, {'_attr':obj.location})))

		else
			# Prevent errors from exploding when the data won't conform to obj.
			try fbObj = toFbObject(obj)
			catch e
				return callback(message:'Wrong object.', name:'wrongInput')
			return callback(null, fbObj)

	fbRequester.getEvent(eventId)
		.validate(fbEventValidator('notOutdated','withinTwoMonths','bigEnough10'))
		.done(onGetEventInfo)
		.fail(genericErrorHandler(callback))

###
Create an Event object from its Facebook id.
###
EventSchema.statics.createFromFBId = (eventId, callback) ->
	# First check if object is already in database.
	@findOne {id:eventId}, (err, doc) =>

		if false # doc
			# If so, attempt to update it and return.
			doc.reFetch()
			return callback(null, doc, false)

		onFetchObject = (err, obj) =>
			console.log('cacete', err)
			if err then return callback(err)

			# Add/update object and call back.
			onFoundOrCreated = (err, obj, isNew) =>
				if err
					if err.name is 'ValidationError'
						for key,value of err.errors
							return callback(message:"Erro de validação.", name:value.type)
					else
						return callback(err)
				callback.apply(this, arguments)

			# Find Event object from fbObject.
			@findOrCreate({id: obj.id}, _.extend(obj,{reviewed:true}), {upsert:true}, onFoundOrCreated)

		# Get a fObject from the given Id.
		@getValidEventFromFb(eventId, onFetchObject)

###
Fetch all events in the database from Facebook again.
###
EventSchema.statics.reFetchAll = (callback) ->
	@find {}, (err, docs) ->
		if err
			return callback?(err)
		count = docs.length
		results = []
		_.each docs, (doc) ->
			doc.reFetch (err) ->
				if err
					if err?.name is "cantFetch"
						log('cantFetch', doc.id, doc.name)
						doc.remove()
					else log('error', err)
				else
					log('200', doc.id, doc.name)
					results.push(doc)
				if !--count
					callback?(null, results)

###
reFetches the object from Facebook.
###
EventSchema.methods.reFetch = (callback) ->
	callback ?= ->

	onCantGetEventInfo = (err) ->
		# TODO:
		# Decide what to do in case we can't get data about this event anymore. Delete?
		return genericErrorHandler(callback).apply(this, arguments)

	onGetEventInfo = (obj) =>

		if obj.count isnt @count
			log("COUNT_CHANGED #{obj.id}:#{obj.name}. #{@count} → #{obj.count}")

		updateAlready = (obj, location={}) =>
			# Simply using toFbObject here wouldn't work, because the invalid venue info (of those
			# events for wich we have to search on google maps geocoding server) would overwrite
			# valid info.
			data = _.extend(location, {
					name: obj.name
					count: obj.count
					start_time: obj.start_time
					description: obj.description or '' # prevent from casting undefined to string
				})
			@update data, (err, num) =>
				if err
					log("ERROR_WITH_DATA #{obj.id}:#{obj.name} ", data, err)
				callback(err, @)

		# Location HAS changed and so have the coordinates
		if obj.location isnt @location and obj.venue.latitude isnt @lat

			log("LOCATION_CHANGED #{obj.id}:#{obj.name}")
			# If object location changed, attempt to get new one from Google.
			gMapsRequester.getValidCoord(obj.location)
				.done((c) -> updateAlready(obj, {lat:c[0],lng:c[1]}))
				.fail(-> log("GMAP_ERROR #{obj.id}:#{obj.name}"); return found.dec()) # decide what TODO
		else
			updateAlready(obj)

	fbRequester.getEvent(@id)
		.validate(fbEventValidator('notOutdated','withinTwoMonths','validTimezone'))
		.done(onGetEventInfo)
		.fail(genericErrorHandler(callback))

BannedEventsSchema = new mongoose.Schema({
	id: String # facebook Id of banned event
	start_time: Date
	}, {
		id: false
	})
BannedEventsSchema.statics.findOrCreate = findOrCreate

EventSchema.statics.Blocked = mongoose.model("Blocked", BannedEventsSchema)

BLOCKED_IDS = []

EventSchema.statics.blockAndRemove = (obj, callback) ->
	Event = @

	EventSchema.statics.Blocked.findOrCreate {id: obj.id}, (err, doc) ->
		doc.start_time = obj.start_time
		doc.save()
		Event.remove {id: obj.id}, (err2) ->
			##
			Event.flushCache()
			EventSchema.statics.Blocked.find {}, (err, all) ->
				# console.log('loading banned events:', err, all)
				BLOCKED_IDS = (o.id for o in all)
			##
			callback(err or err2)

EventSchema.statics.Blocked.find {}, (err, all) ->
	BLOCKED_IDS = (o.id for o in all)
	# console.log 'blocked:', BLOCKED_IDS

EventSchema.statics.findOrCreate = findOrCreate

####################################################################################################
####################################################################################################

EventSchema.statics.getCached = (cb) ->
	mc = memjs.Client.create()
	mc.get 'events', (err, val, key) ->
		if err # if cache error, query db
			console.warn('Cache error:', err)
			@find({start_time: {$gte: new Date(new Date().setHours(0,0,0,0))}}, cb)
			ret = []
		else if val is null
			console.warn('Cache query for events returned null.')
			ret = []
		else
			ret = JSON.parse(val.toString())
		cb(null, ret)

EventSchema.statics.flushCache = (cb) ->
	mc = memjs.Client.create()
	console.log('Flushing cached events.')
	@find {start_time: {$gte: new Date(new Date().setHours(0,0,0,0))}},
		(err, events) ->
			mc.set('events', JSON.stringify(events), cb)

module.exports = EventSchema