
# models/ninja.coffee
# for vempraruavem.org, by @f03lipe

# Ninja model.

###
Ok?

InternalError
noTwitCasting
500twitCasting
###

mongoose = require 'mongoose'
request = require 'request'
crypto = require 'crypto'
_ = require 'underscore'

findOrCreate = require('./lib/findOrCreate')

MINS_TILL_TIMEOUT = 31

# Schema
NinjaSchema = new mongoose.Schema({
		id: String
		social_id: String
		isFromTwitter: Boolean
		name: String
		screen_name: String
		avatar_url: String

		lastSave: Date
		firstAccess: Date
		lastAccess: Date

		isLive: Boolean
		lastMovieId: Number
		live_viewers_count: {type: Number, default: 0}
		covering: Array
		lat: Number
		lng: Number
	}, {
		id: false
		toObject: { virtuals: true }
		toJSON: { virtuals: true }
	})

# Virtuals
NinjaSchema.virtual('live_url').get ->
	'http://twitcasting.tv/'+@id

NinjaSchema.virtual('url').get = ->
	'http://vempraruavem.org/#ninjas/'+@id

NinjaSchema.virtual('visible').get = ->
	@isVisible()

####################################################################################################
####################################################################################################
# Cache

NinjaSchema.statics.flushCache = (cb) ->
	console.log('Flushing ninjas in cache')
	@find { lastSave: {$gte: new Date(new Date().valueOf()-MINS_TILL_TIMEOUT*60*1000)}, lat: {$ne: null}, lng: {$ne: null}, isLive: true},
		(err, ninjas) ->
			mc.set('ninjas', JSON.stringify(ninjas), cb)

NinjaSchema.statics.getCached = (cb) ->
	mc.get 'ninjas', (err, val, key) ->
		if err # if cache error, query db
			console.warn('Cache error:', err)
			@findVisible(cb)
			ret = []
		else if val is null
			console.warn('Cache query for ninjas returned null.')
			ret = []
		else
			ret = JSON.parse(val.toString())
		cb(null, ret)

####################################################################################################
####################################################################################################

getUserStatusFromTwitCasting = (id, callback) ->
	onGetResults = (err, res, obj) ->
		console.log('Path reached:', res.request.uri.path)
		callback(err, obj)
	request.get({
		url: 'http://api.twitcasting.tv/api/userstatus', json: true, qs: { user: id, type: 'json' }},
		onGetResults)

getLiveStatusFromTwitCasting = (id, callback) ->
	onGetResults = (err, res, obj) ->
		console.log('Path reached:', res.request.uri.path)
		callback(err, obj)
	request.get({
		url: 'http://api.twitcasting.tv/api/livestatus', json: true, qs: { user: id, type: 'json' }},
		onGetResults)

NinjaSchema.statics.findOrCreateFromInfo = (data, callback) ->

	getUserStatusFromTwitCasting data.username, (err, twcProfile) =>
		if err
			return callback({type:'500twitCasting'})
		if not twcProfile.userid
			return callback({type:'noTwitCasting'})

		getLiveStatusFromTwitCasting data.username, (err, twcLive) =>
			if err
				return callback({type:'500twitCasting'})

			@findOrCreate {social_id: twcProfile.socialid}, (err, ninja, isNew) ->
				if err
					return callback({type:'InternalError'})

				ninja.id = twcProfile.userid
				ninja.isFromTwitter = data.isTwitter or false
				ninja.name = twcProfile.name
				ninja.screen_name = twcProfile.screenname
				##
				ninja.avatar_url = data.avatar_url
				if twcLive.islive
					ninja.isLive = true
					ninja.live_viewers_count = twcLive.viewers
				else
					ninja.isLive = false
					ninja.live_viewers_count = 0
				##
				ninja.lastSave = new Date()
				ninja.lastAccess = new Date()
				if isNew
					ninja.firstAccess = ninja.lastSave
				##
				ninja.lat = data.lat || null
				ninja.lng = data.lng || null
				##
				ninja.save (err) ->
					console.log('Adding ninja', _.pick(ninja, ['isLive','live_viewers_count']))
					callback(err, ninja)


NinjaSchema.statics.createFromTwitterProfile = (twtProfile, callback) ->

	@findOrCreateFromInfo({
		username: twtProfile.username
		social_id: twtProfile._json.id_str
		isTwitter: true
		avatar_url: twtProfile.photos[0].value
	}, callback)

NinjaSchema.statics.createFromFacebookProfile = (fbProfile, callback) ->

	@findOrCreateFromInfo({
		username: 'f:'+fbProfile.id
		social_id: 'f:'+fbProfile.id
		isTwitter: false
		avatar_url: 'http://graph.facebook.com/'+fbProfile.id+'/picture'
	}, callback)

NinjaSchema.statics.findVisible = (cb) ->
	conds = { lastSave: {$gte: new Date(new Date().valueOf()-MINS_TILL_TIMEOUT*60*1000)}, lat: {$ne: null}, lng: {$ne: null}, isLive: true}
	@find.call(@, [conds].concat(arguments), cb)

NinjaSchema.statics.findOrCreate = findOrCreate

NinjaSchema.statics.updateAll = (cb) ->

	@find {}, (err, ninjas) =>
		count = ninjas.length

		dec = () =>
			count -= 1
			if count <= 0
				@flushCache(cb)

		if err
			cb?(err)
			return

		for ninja in ninjas
			if ninja.isLive
				ninja.updateLiveStatus (err, ninja) ->
					console.log("Updated: ninja=#{ninja.screen_name}, status=#{ninja.isLive}")
					dec()
			else
				dec()

mc = require('memjs').Client.create()

NinjaSchema.methods.isVisible = ->
	@isLive and @lat and @lng and @getTillTimeout() > 0

NinjaSchema.methods.getTimeout = ->
	MINS_TILL_TIMEOUT*60*1000+1*new Date(@lastSave)

NinjaSchema.methods.getTillTimeout = ->
	Math.max(0, MINS_TILL_TIMEOUT*60*1000 - (new Date()-@lastSave)) # MINS_TILL_TIMEOUT minutos

NinjaSchema.methods.updateLiveStatus = (callback) ->

	getLiveStatusFromTwitCasting @id, (err, twcLive) =>
		if err
			return callback({type:'500twitCasting'})
		@isLive = twcLive.islive
		@live_viewers_count = twcLive.viewers
		@lastAccess = new Date()
		if @getTillTimeout() < 0
			console.log('invalidating user', @getTillTimeout(), 1*@lastSave)
			@lat = @lng = null
		@save (err) =>
			if err
				return callback({type:'InternalError'}, @)
			callback(err, @)

NinjaSchema.methods.reFetch = (callback) ->

	callback ?= ->

module.exports = NinjaSchema