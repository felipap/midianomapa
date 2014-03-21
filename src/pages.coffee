
###
# pages.coffee
# for vempraruavem.org, by @f03lipe2
###

_	= require 'underscore'
request = require 'request'

Event = require './models/event.js'
Ninja = require './models/ninja.js'

stats = {}

Event.flushCache (err, success) -> Event.getCached((err, docs) -> stats.events = docs.length;)
Ninja.flushCache (err, success) -> Ninja.getCached((err, docs) -> stats.ninjas = docs.length;)

Pages = {
	index_get: (req, res) ->
		console.log("Sending stats:", stats)
		res.render('index', {
			isMe: process.env.myself and (req.query.m is process.env.myself)
			stats: stats
		})
}

Ninjas = {

	login_get: (req, res) ->
		req.logout?()
		return res.render('login')

	logout_get: (req, res) ->
		req.user.lat = null
		req.user.lng = null
		req.user.isLive = false
		Ninja.flushCache()
		req.logout()
		res.redirect('/')

	get: (req, res) ->
		if req.query.all?
			Ninja.find {}, (err, ninjas) ->
				res.end(JSON.stringify(ninjas)) 
		else
			Ninja.getCached (err, ninjas) ->
				if err
					console.warn('Couldn\´t get ninjas', err)
					return res.status(500).end()
				res.end(JSON.stringify(ninjas))

	panel_get: (req, res) ->
		if req.user.firstAccess.valueOf() is req.user.lastAccess.valueOf()
			req.flash('success', "Olá! Esse é o seu painel de controle.")
		req.user.updateLiveStatus (err) ->
			if err
				console.log err
				req.flash('error', err.message or "Ops! Detectamos algum erro aqui...")
			return res.render('panel', {
				ninja: req.user,
				page_title: if req.user.isLive then ''+req.user.id+' está ao vivo' else undefined,
				messages: req.flash(),
			})

	iamhere: (req, res) ->
		if not req.user
			res.status(401).end()
		req.user.lat = parseFloat(req.body.lat)
		req.user.lng = parseFloat(req.body.lng)
		req.user.lastSave = new Date()
		req.user.lastAccess = req.user.lastSave
		req.user.save ->
			Ninja.flushCache()
			res.status(200).end(JSON.stringify({ends:req.user.getTimeout()}))

	remove: (req, res) ->
		Ninja.remove {socialid: req.params.socialid}, (err, nAffected) ->
			Ninja.flushCache()
			res.end("Removed {id:#{req.params.id}}? Num deleted: #{nAffected}. Err: #{err}.")
}

translt = {
	'cantFetch':'Parece que esse evento não é público ou não existe.',
	'wrongInput':'Essa não é uma url válida, é? ;)',
	'invalidObject':'Tem certeza que esse é o link de um evento do Facebook?',
	'eventIsOutdated':'Esse evento já aconteceu! :(',
	'cannotLocate': (err) ->
		if err._attr
			title = "Não conseguimos localizar \'#{err._attr}\' evento no mapa."
		else
			title = 'Não conseguimos localizar esse evento no mapa.'
		"""Não encontramos esse evento no mapa. :(
			<i class="fa fa-question-circle" onMouseOver="$(this).tooltip(\'show\')" data-html="true" title="#{title}"></i>"""
	'dateTooDistant':'Ainda falta muito tempo para esse evento...',
}

Events = {

	get: (req, res) ->
		Event.getCached (err, events) ->
			if err
				console.warn('Couldn\´t get events', err)
				return res.status(500).end()
			res.end(JSON.stringify(events))

	put: (req, res) ->
		Event.createFromFBId(req.body.id,
			(err, obj, isNew) ->
				if err
					console.log(err)
					switch typeof translt[err.name]
						when 'undefined' then message = err.message or 'Algum erro ocorreu.'
						when 'string' then message = translt[err.name]
						when 'function' then message = translt[err.name](err)
					res.status(400)
						.end(JSON.stringify({
							error: true,
							message: message,
						}))
				else
					Event.flushCache()
					obj = obj.toJSON() # Otherwise the next line won't work.
					obj.isNew = isNew
					res.end(JSON.stringify(obj));
			)

	block: (req, res) ->
		if req.params.id
			Event.findOne {id: req.params.id}, (err, obj) ->
				console.log(err)
				if obj
					Event.blockAndRemove obj, (err) ->
						res.end("Block {id:#{req.params.id}}? Err: #{err}.")
				else
					res.end("Block {id:#{req.params.id}}? Not found.")
		else res.end()
				
	review: (req, res) ->
		Event.update {id: req.params.id}, {reviewed:true}, (err, nAffected) ->
			res.end("Updated {id:#{req.params.id}}? Num affected: #{nAffected}. Err: #{err}.")

	search_get: (req, res) ->
		access_token = req.query.access_token or ''
		tags = ['passeata','protesto','manifestação','ato+apoio','ato+contra','ato+em','mobilização+contra']

		added = []
		count = tags.length

		res.connection.setTimeout(0)
		for tag in tags
			do (tag) -> # create context
				Event.crawlAndAdd tag, access_token, (err, docs) ->
					if err
						added.push({tag: tag, error: err})
						count--
						if err.name is 'cantFetch'
							res.status(400).end('{"message":"You sure that token is still good?"}')
						else if count <= 0
							console.log('ending stream', added.length)
							res.end(JSON.stringify(added))
					else
						added.push({tag: tag, count: docs.length, results: docs})
						count--

						console.log 'count:', count
						if count <= 0
							Event.flushCache()
							console.log('ending stream', added.length)
							res.end(JSON.stringify(added))
}


module.exports =
	Pages: Pages
	Events: Events
	Ninjas: Ninjas