
# ninjas/add.coffee

jobber = require('../jobber.js')((e) ->
	console.log("Adding ninja {id:#{process.argv[2]}}.")
	unless process.argv[5]
		console.log('Usage node ./add.coffee <userid> <lat> <lng> <avatar_url>')
		return e.quit(true)
	# unless process.argv[3].length > 6 and process.argv[4].length > 6
	# 	console.log('')
	# 	return e.quit(true)
	Ninja = require('../../src/models/ninja.js')
	Ninja.findOrCreateFromInfo {
			username: process.argv[2]
			isTwitter: true
			lat: parseFloat(process.argv[3]) or null
			lng: parseFloat(process.argv[4]) or null
			avatar_url: process.argv[5]
		}, (err) ->
			Ninja.flushCache (err2) ->
				e.quit(err or err2)
).start()