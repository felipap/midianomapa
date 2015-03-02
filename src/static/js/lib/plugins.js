// Avoid `console` errors in browsers that lack a console.
(function() {
	var method;
	var noop = function () {};
	var methods = [
		'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
		'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
		'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
		'timeStamp', 'trace', 'warn'
	];
	var length = methods.length;
	var console = (window.console = window.console || {});

	while (length--) {
		method = methods[length];

		// Only stub undefined methods.
		if (!console[method]) {
			console[method] = noop;
		}
	}
}());

require('jquery');

$.fn.share = function (options) {

	// Prevent binding multiple times.
	if (this.find('.sn-share-btns').length)
		return;

	var defOptions = {
		trigger: 'hover',
		duration: 'fast',
		text: undefined,
		url: 'http://vempraruavem.org',
	};
	// Get options from default < element datset < arguments.
	var options = _.extend(_.extend(defOptions, this.data()), options);

	var funcs = {
		twitter: function (e) {
			if (options.text || options.url)
				var url = 'http://twitter.com/share?'+(options.text && '&text='+encodeURIComponent(options.text))||('url='+encodeURIComponent(options.url));
			else throw "No url or text specified";
			window.open(url,'','width=500,height=350,toolbar=0,menubar=0,location=0','modal=yes');
		},
		facebook: function (e) {
			if (options.url)
				var url = 'http://www.facebook.com/sharer.php?u='+encodeURIComponent(options.url);
			else throw "No url or text specified";
			window.open(url,'','width=500,height=350,toolbar=0,menubar=0,location=0','modal=yes');
		},
		gplus: function (e) {
			if (options.url)
				var url = 'https://plusone.google.com/_/+1/confirm?hl=pt&url='+encodeURIComponent(options.url);
			else throw "No url or text specified";
			window.open(url,'','width=500,height=350,toolbar=0,menubar=0,location=0','modal=yes');
		},
	};

	this.addClass('sn-share');
	var html = $('<div class="sn-share-btns"><div class="btn-group"><button class="btn btn-xs btn-info btn-twitter"><i class="fa fa-twitter"></i></button><button class="btn btn-xs btn-info btn-facebook">&nbsp;<i class="fa fa-facebook"></i>&nbsp;</button><button class="btn btn-xs btn-info btn-gplus"><i class="fa fa-google-plus"></i></button></div><div class="arrow"></div></div>');

	html.find('.btn-twitter').click(funcs.twitter);
	html.find('.btn-facebook').click(funcs.facebook);
	html.find('.btn-gplus').click(funcs.gplus);
	html.appendTo(this);

	this.click(function(evt){
		evt.stopPropagation();
		evt.preventDefault();
		return false;
	})

	if (options.now === true) {
		html.fadeIn();
		this.on('click '+(options.trigger === 'hover'?'mouseenter':''), function (e) {
			html.fadeIn(options.duration);
		});
	} else {
		this.on('click '+(options.trigger === 'hover'?'mouseenter':''), function (e) {
			html.fadeIn(options.duration);
		});
	}
	this.on('mouseleave', function (e) {
		html.fadeOut(options.duration);
	});
}