/*
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
*/

var createValidator,
  __slice = [].slice;

module.exports = createValidator = function(exceptions) {
  return (function() {
    var tests;
    tests = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return function(data) {
      var test, tname, _i, _len;
      for (_i = 0, _len = tests.length; _i < _len; _i++) {
        tname = tests[_i];
        test = exceptions[tname];
        if (!test) {
          throw "Test named " + tname + " doesn't exist.";
        }
        if (!test.passes(data)) {
          return {
            name: test.name,
            _check: tname,
            _attr: data[test.data_attr],
            _silent: test.silent === void 0 ? false : test.silent
          };
        }
      }
      return false;
    };
  });
};
