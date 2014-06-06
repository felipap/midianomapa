
// panel.js
// for midianomapa.org, by @f03lipe

$.fn.share = function (options) {

	// Prevent binding multiple times.
	if (this.find('.sn-share-btns').length)
		return;

	var defOptions = {
		trigger: 'hover',
		duration: 'fast',
		text: undefined,
		url: 'http://vempraruavem.org'u,
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
};

var gmap = new (function GMap() {

	this.map = new google.maps.Map(document.getElementById("map"), {
		center: new google.maps.LatLng(-14.656, -52.09),
		zoom: 4,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_CENTER }
	});

	this.resize = function () {
		$("#map-wrapper").height(Math.max(100, $(window).height()-$('body').height()+$("#map-wrapper").height()-($('body').width()>500?50:0)));
	}
	$(window).resize(this.resize);

	this.centerOnUser = function (keepZoom) {
		this.map.setCenter(userPosition.getAsLatLngObj());
		if (!keepZoom)
			this.map.setZoom(13);
	}
});

/* When called binded to an object (implementEvents.bind(this)()), adds .on() and .bind() methods to
* it. */
function implementEvents() {

	this._callbacks = {};
	this.on = function (eventName, func, t) {
		if (typeof func !== 'function')
			throw "Invalid argument to .on() "+func
		if (this._callbacks[eventName])
			this._callbacks[eventName].push(t?func.bind(t):func);
		else
			this._callbacks[eventName] = [t?func.bind(t):func];
	}
	this.trigger = function (eventName, args) {
		var funcs = this._callbacks[eventName];
		if (!funcs)
			return false;
		for (var i=0; i<funcs.length; i++) {
			funcs[i].apply(this, args); // Bind to this or entered object (arg 't' in this.on)
		}
		return i;
	}
}

var userMarker = new google.maps.Marker({
	map: gmap.map, draggable: true,
	position: gmap.map.getCenter(),
});

/* The timeout object controls events and data related to the time when the user will have to save
* their location again (when this.getRest() <= 0). */
var timeout = new (function () {
	this.value = null;
	implementEvents.bind(this)();

	this.start = function (x,visible) {
		if (x && visible) {
			this.set(x);
		}
		this.render();
	}

	this.initialize = function () {
		this.on('change', this.render, this);
	}

	this.set = function (n) { this.value = n; this.trigger('change', this.render); loop(); return; }

	this.get = function () { return this.value;	}

	this.getRest = function () { return this.value - 1*new Date(); }

	this.render = function () {
		var rest = this.getRest();
		if (rest > 0 && !userPosition.isNull()) {
			$(".visibility-status").html("Você está <span class='label label-primary'>visível</span> no mapa do site. Ficará assim por mais <span id='time'></span>.");
		} else {
			$(".visibility-status").html("Você está <span class='label label-default'>invisível</span>. Salve a sua localização para aparecer no mapa do site.");
		}

		if (rest > 60000) {
			$("#time").html(Math.floor(rest/60000)+" minuto"+(Math.floor(rest/60000)>1?'s':''));
		} else {
			$("#time").html(Math.round(rest/1000)+" segundo"+(Math.round(rest/1000)>1?'s':''));
		}
	};
	var intervalId = null;
	var self = this;

	function loop () {
		if (intervalId)
			clearInterval(intervalId);
		intervalId = setInterval(function () {
			if (self.getRest() <= 0) {
				clearInterval(intervalId);
			}
			self.render();
		},1000);
	}
});


$("[data-action=save-coords]").click(function (e) {
	$("[data-action=save-coords]").html('<i class="fa fa-spinner fa-spin"></i>').addClass('wow').removeClass('bad');
	$.ajax({
		method: "post",
		type: "json",
		url: '/api/ninjas/iamhere',
		data: userPosition.get(),
	}).done(function (data) {
			$("[data-action=save-coords]")
				.html('<i class="fa fa-check"></i>')
				.delay(500)
				.queue(function(n) {
					$(this).find('i').fadeOut(300);
					n();
				})
				.delay(300)
				.queue(function(n) {
					$(this).find('i').remove();
					$(this).html("<span>Salvo!</span>");
					n();
				})
				.delay(1000)
				.queue(function(n) {
					$(this).find('span').fadeOut(300);
					n();
				})
				.delay(500)
				.queue(function(n) {
					$(this).find('span').html("Salvar").fadeIn();
					$(this).removeClass('wow');
					$('body').focus();
					n();
				});
			timeout.set(JSON.parse(data).ends || timeout.get());
		}).fail(function (data) {
			$("[data-action=save-coords]")
				.removeClass('wow').addClass('bad').html('<span>ERRO!</span>')
				.delay(1500)
				.queue(function(n) {
					$(this).find('span').fadeOut(300);
					$(this).removeClass('wow').removeClass('bad');
					n();
				})
				.delay(300)
				.queue(function (n) {
					$(this).find('span').html('Salvar').fadeIn();
					n();
					$('body').focus();
				})
		});
});

var userPosition = new (function () {

	var data = {lat:undefined,lng:undefined};
	var geocoder = new google.maps.Geocoder();

	this.initialize = function () {
		implementEvents.bind(this)();
		google.maps.event.addListener(userMarker, 'dragend', this.setFromEvent.bind(this));
		this.on('change', this.render);
	}

	this.get = function () { return data; }

	this.isNull = function () { return !data.lat || !data.lng; }

	this.setFromEvent = function (e) { 
		return this.set({lat:e.latLng.pb,lng:e.latLng.qb});
	}

	this.getAsLatLngObj = function () { return new google.maps.LatLng(data.lat, data.lng); }

	this.setFromGeolocator = function (p) { return this.set({lat:p.coords.latitude,lng:p.coords.longitude}); }

	this.set = function (x) {
		if (x.lat === null && x.lng === null) { // user position not pre-defined
			data = {lat: -14.656, lng: -52.09}
			this.trigger('change');
			return this;
		} else if (typeof x.lat === "number" && typeof x.lng === "number") {
			data = x;
			this.trigger('change');
			return this;
		} else if (typeof x.lat === "number" && typeof x.lng === "string") {
			data = {lat: parseInt(x.lat), lng: parseInt(x.lng)};
			this.trigger('change');
			return this;
		} else {
			throw "Invalid argument to .set(): "+JSON.stringify(arguments)
		}
	}

	this.render = function () {
		var el = $(".data-address");
		geocoder.geocode({
				'latLng': new google.maps.LatLng(data.lat, data.lng)
			}, function(results, status) {
				// console.log('STATUS: ', status)
				if (status === 'OK') {
					el.html(results[0].formatted_address);
					gmap.resize();
				}
			}, "json");
		userMarker.setPosition(this.getAsLatLngObj());
	}

	this.initialize();
});

var watchId = navigator.geolocation.watchPosition(function onGetPosition (pos) {
		// Resize maps after .output has altered the available space.
		$(".output.success").fadeIn(function () {gmap.resize();});
		$(".initial-msg").slideUp();

		// TODO add accuracy measure!
		userPosition.setFromGeolocator(pos);
		gmap.centerOnUser();
	}, function onCantGetPosition() {
		$(".initial-msg").animate({color:'red'}).delay(1000).fadeOut();
		$(".output.error").fadeIn();
		$(".blackout").fadeIn();
	}, {
	timeout: 5000,
	maximumAge: 0,
	enableHighAccuracy: true,
});