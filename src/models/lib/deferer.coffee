
###
An all-purpose non-documented deferer.
.validate() functions must take a 'data' parameter, and return false in case of no error.
###

module.exports = RequestDeferer = ->

	params = undefined			# Keep last parameters passed to @resolve().
	cb = {done:[], fail:[]}		# List of callbacks.
	val = -> false				# Default validation function (returns no error).

	return {
		# Add function to call when resolved and validated without error.
		done: (onDone) ->
			cb['done'].push(onDone)
			@resolve.apply(this, params)
			return @

		# Add function to call when resolved and/or validated with error.
		fail: (onFail) ->
			cb['fail'].push(onFail)
			@resolve.apply(this, params)
			return @

		# Add validation function.
		validate: (nval) ->
			oldVal = val
			val = () ->
				if err = oldVal.apply(this, arguments)
					return err
				return nval.apply(this, arguments)
			return @

		# Pass to validate
		resolve: (err, data) ->
			if not arguments.length # Special case.
				if params # Allow @resolve() to become @resolve(<last_params_passed>).
					return @resolve.apply(this, params)
				else # Return false if no data is available yet (@resolve was called by done/fail).
					return false

			params = arguments

			# Test for request error or run a more specific test (if available).
			if err or (err = val(data))
				t(err) for t in cb['fail'] # Call functions in cb.fail
			else
				t(data) for t in cb['done'] # Call functions in cb.done
			return @
	}