/*
An all-purpose non-documented deferer.
.validate() functions must take a 'data' parameter, and return false in case of no error.
*/

var RequestDeferer;

module.exports = RequestDeferer = function() {
  var cb, params, val;
  params = void 0;
  cb = {
    done: [],
    fail: []
  };
  val = function() {
    return false;
  };
  return {
    done: function(onDone) {
      cb['done'].push(onDone);
      this.resolve.apply(this, params);
      return this;
    },
    fail: function(onFail) {
      cb['fail'].push(onFail);
      this.resolve.apply(this, params);
      return this;
    },
    validate: function(nval) {
      var oldVal;
      oldVal = val;
      val = function() {
        var err;
        if (err = oldVal.apply(this, arguments)) {
          return err;
        }
        return nval.apply(this, arguments);
      };
      return this;
    },
    resolve: function(err, data) {
      var t, _i, _j, _len, _len1, _ref, _ref1;
      if (!arguments.length) {
        if (params) {
          return this.resolve.apply(this, params);
        } else {
          return false;
        }
      }
      if (err || (err = val(data))) {
        _ref = cb['fail'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          t = _ref[_i];
          t(err);
        }
      } else {
        _ref1 = cb['done'];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          t = _ref1[_j];
          t(data);
        }
      }
      return this;
    }
  };
};
