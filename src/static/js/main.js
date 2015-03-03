
require('./lib/plugins.js');

// main.js
// for midianomapa.org, by @f03lipe

Date.prototype.addDays = function(days) {
	var dat = new Date(this.valueOf());
	dat.setDate(dat.getDate() + days);
	return dat;
}

Date.prototype.sameDate = function(b) {
	return (this.getDate() == b.getDate()) && (this.getMonth() == b.getMonth()) && (this.getYear() == b.getYear());
}

Date.prototype.slashed = function() {
	return ''+this.getDate()+'/'+(this.getMonth()+1)+'/'+(this.getFullYear());
}

Date.prototype.colon = function() {
	return ''+this.getHours()+':'+(this.getMinutes()||'00');
}

var Bootstrap = require('bootstrap')
var Handlebars = require('handlebars')
var _ = require('lodash')
var Backbone = require('backbone')
$('body').tooltip({selector:'[data-toggle=tooltip]'});


window._ = _;
Backbone.$ = $;

var models = require('./lib/models.js')
var views = require('./lib/views.js')
var mapViews = require('./lib/mapViews.js')

/* https://gist.github.com/i-like-robots/5803698: {{#loop 12}} <output> {{/loop}} */
Handlebars.registerHelper('loop',
	function(c,o){var out='';c=Math.max(0,c);while(c--){out+=o.fn();}return out;}
);


// Program google maps to fill screen height.
function fillScreenGMaps() {
	if ($('body').width()<770)
		$('#map-wrapper').height($(document.body).height()-93);
	else {
		if ($('body').height()<600)
			$('#map-wrapper').height($(document.body).height()-45-3); // $('.navbar').outerHeight() = 40
		else
			$('#map-wrapper').height($(document.body).height()-40); // $('.navbar').outerHeight() = 40
	}
}
fillScreenGMaps();
$(window).resize(fillScreenGMaps);

window.Router = Backbone.Router.extend({
	initialize: function (options) {
		// Backbone.Router.apply(this, arguments)

		this.map = new google.maps.Map(document.getElementById("map"), {
			center: new google.maps.LatLng(-14.656, -52.09), // The center magic numbers are BR's non-exact center coordinates.
			zoom: 5,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_CENTER }
		});

		// this.geoLocate();
		$("[data-action=centralize]").click(_.bind(this.geoLocate, this, 9));

		this.date = new models.Date();
		this.eventList = new models.EventList();
		this.ninjaList = new models.NinjaList();

		this.route("events/:id", "events", function (e) {
			console.log(arguments)
			e = e.replace(/(^\s+|\s+$)/g,''); // Trim e.
			var doc = this.eventList.findWhere({id:parseInt(e)});
			if (doc) {
				this.mapsNinjasView.closeInfoWindows();
				this.map.setOptions({
					center: new google.maps.LatLng(doc.get('lat'),doc.get('lng')),
					zoom: 15,
				});
				this.eventListView.prender();
				this.mapsEventsView.showView(doc);
			} else {
				alert('Esse evento não está mais no mapa. Será que ele ainda existe?')
				this.navigate('/');
			}
		});
		this.route("ninjas/:id", "ninjas", function (e) {
			e = e.replace(/(^\s+|\s+$)/g,'');
			var doc = this.ninjaList.findWhere({id:e});
			if (doc) {
				this.mapsEventsView.closeInfoWindows();
				this.map.setOptions({
					center: new google.maps.LatLng(doc.get('lat'),doc.get('lng')),
					zoom: 15,
				});
				this.mapsNinjasView.showView(doc);
			} else {
				alert('Esse ninja ficou invisível. Será que ele está offline?')
				this.navigate('/');
			}
		});
	},

	geoLocate: function (zoom) {
		var self = this;
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (pos) {
				var coord = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
				self.map.setCenter(coord);
				self.map.setZoom(zoom || 4)
			});
		}
	},

	//***

	goToNinja: function (id, trigger) {
		this.navigate('/ninjas/'+id, {trigger:trigger||false});
	},

	goToEvent: function (id, trigger) {
		this.navigate('/events/'+id, {trigger:trigger||false});
	},

	unselectAll: function () {
		this.navigate('/');
	},

	// ****

	/* Functions here require the app object to be referenciable as window.app – because of poor
	* design choices – meaning it must have already been set to the global scope
	* (ie initialize() must have returned). Btw, TODO: fix this.*/
	start: function () {

		this.mapsEventsView = new mapViews.Events({collection: this.eventList});
		this.mapsNinjasView = new mapViews.Ninjas({collection: this.ninjaList});

		this.eventListView = new views.EventListView({collection: this.eventList});
		this.eventAdder = new views.EventAdderView();
		this.calendarView = new views.CalendarView({model:this.date});
		this.dateDisplayView = new views.DateDisplayView({model:this.date});

		// Render calendarView when events are changed.
		this.eventList.on('reset', this.calendarView.render, this.calendarView);

		var self = this;
		this.date.on('change', function () {
			if (self.date.get('dateBound')) {
				self.eventList.reset(_.filter(self._raw_events, function (e) {
					return self.date.get('currentDate').sameDate(new Date(e.start_time));
				}, self));
			} else {
				self.eventList.reset(self._raw_events.slice());
			}
		});

		this._raw_events = this._raw_ninjas = [];
		// Is there a deffer solution to this?
		var count = 2;
		this.eventList.once('reset', function () {
			self._raw_events = this.toJSON();
			if (!--count)
				Backbone.history.start({pushState: false});
		});
		this.ninjaList.once('reset', function () {
			self._raw_ninjas = this.toJSON();
			if (!--count)
				Backbone.history.start({pushState: false});
		});

		// Is brute-forcing no-cache necessary?
		this.eventList.fetch({
			// cache: false,
			reset: true});
		this.ninjaList.fetch({
			// cache: false,
			reset: true});
	},

	//

	selectDate: function (d) {
		if (typeof d === 'undefined') {
			this.selectDate(this.date.get('currentDate'));
			return;
		}
		this.date.updateCurrentDate(d);
	},

	unselectDate: function () {
		this.date.set('dateBound', false);
	},

	toggleBoundDate: function () {
		if (this.date.get('dateBound')) {
			this.unselectDate();
		} else {
			this.selectDate(undefined);
		}
	},

	moveCurrentDate: function (d) {
		this.selectDate(new Date(this.date.get('currentDate').addDays(d)));
	},
});

window.app = new Router();
app.start();



(function setCSRFToken () {
	$.ajaxPrefilter(function(options, _, xhr) {
		if (!options.crossDomain) {
			xhr.setRequestHeader('csrf-token', $('meta[name=\'csrf-token\']').attr('content'));
		}
	});
})();

/* Listen for <ESC> while inputting event. Quit if so. */
$(document).keyup(function(e){
	if(e.keyCode === 27 && $('#add-event').is(':visible'))
		$("#add-event").fadeOut();
});
