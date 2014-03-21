
# searchEvents.coffee
# This is a job. It searches Facebook for new events, if the facebook_perm_access_token allows it.

jobber = require('./jobber.js')((e) ->
	Event = require('../src/models/event.js')
	# ready to go
	tags = ['passeata','protesto','manifestação','ato+apoio','ato+contra','ato+em','mobilização+contra']
	console.log('Starting to search facebook with tags:', tags)

	count = tags.length
	eventsCount = 0
	for tag in tags
		do (tag) -> # hold 'tag' in context 
			Event.crawlAndAdd tag, process.env.facebook_perm_access_token, (err, docs) ->
				count--
				console.log 'remaining:', count
				if err
					console.log({tag: tag, error: err})
					if err.name is 'cantFetch'
						console.warn('{"message":"You sure that token is still good?"}')
				else
					eventsCount += docs.length
					console.log({tag: tag, count: docs.length})#, results: docs})
					if count <= 0
						Event.flushCache()
						console.log("Total events added:", eventsCount)
						console.log("Process terminated. err:", err)
						return e.quit(true)
).start()