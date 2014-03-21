
###
createValidator takes as input a dictionary of exceptions like this
eventExceptions = {
	fetchable: {
		name: 'cantFetch'
		passes: (data) -> not data.error
		data_attr: 'error'
		silent: true
	}
}
it then returns a validator function, that takes as input the name of the exceptions to be tested
for (using the obligatory method .passes(data)), when data is supplied.

if
> createValidator(eventExceptions)('fetchable')(event)
returns false, the object passed the 'fetchable' test. Otherwise, it will return a detailed error
object, with
- name 		# name of the error. inherited from exception obj.
- _check 	# name of the exception tested. inherited from exception obj.
- _attr 	# name of the data attribute related to the error. inherited from exception obj.
- _silent 	# if the exception is a silent one. inherited from exception obj. defaults to false.

the _silent attribute is useful for logging and debugging purposes.
###

module.exports = createValidator = (exceptions) ->
	# Returns a validator, a fun that takes the name of pre-existent validation functions
	return ((tests...) ->
		return (data) ->
			# Must follow this specific order.
			for tname in tests
				test = exceptions[tname]
				unless test
					throw "Test named #{tname} doesn't exist."
				
				if not test.passes(data)
					return {
						name: test.name,
						_check: tname,
						_attr: data[test.data_attr],
						_silent: if test.silent is undefined then false else test.silent
					}
			return false)