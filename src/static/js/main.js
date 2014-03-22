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

// Place any jQuery/helper plugins in here.
require(['jquery'], function ($) {

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
});

/* main.js
* for vempraruavem.org, by @f03lipe
* Uses require.js, jquery, Backbone, underscore and twitter-bootstrap.
*/

function mm(min, num, max) {
	return Math.max(min, Math.min(num, max));
}

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

require(['jquery', 'backbone', 'underscore', 'handlebars', 'bootstrap'], function ($, Backbone, _, HandleBars) {

	/* https://gist.github.com/i-like-robots/5803698: {{#loop 12}} <output> {{/loop}} */
	Handlebars.registerHelper('loop',function(c,o){var out='';c=Math.max(0,c);while(c--){out+=o.fn();}return out;});

	// The default view that EventAdder, Calendar and others extend from.
	var GenericBoxView = Backbone.View.extend({
		btn: $("<div>"),
		constructor: function () {
			var self = this;
			this.btn.click(function (e) { e.preventDefault(); self.toggle(); });
			Backbone.View.apply(this, arguments);
			this.$el.on('click', '[data-action=exit]', function () { self.hide(); });
		},
		show: function () {
			this.$el.fadeIn();
			this.btn.addClass('active');
			var self = this;
		},
		hide: function () {
			this.$el.fadeOut();
			this.btn.removeClass('active');			
		},
		toggle: function () {
			this.$el.fadeToggle();
			this.btn.toggleClass('active');
		}
	});

	/*
	* */

	var NinjaItem = Backbone.Model.extend({
		initialize: function () {},
	});

	var NinjaList = Backbone.Collection.extend({
		model: NinjaItem,
		url: '/api/ninjas',
		comparator: 'live_viewers_count',
	});

	/*
	* */

	var EventItem = Backbone.Model.extend({
		initialize: function () {},
		getLatLng: function () {
			return new google.maps.LatLng(this.get('lat'), this.get('lng'));
		},
		/* This modified version of 'parse' will add a little (a few meters) noise to the
		* coordinates, so markers don't overlap each other. */
		parse: function () {
			var hash = Backbone.Model.prototype.parse.apply(this, arguments);
			hash.lat += (Math.random()-Math.random())/5000;
			hash.lng += (Math.random()-Math.random())/10000;
			return hash;
		}
	});

	var EventList = Backbone.Collection.extend({
		model: EventItem,
		comparator: 'start_time',
		url: '/api/events'
	});

	/* Google maps views.
	* */

	var GenericMapsMarkerView = Backbone.View.extend({

		closeInfoWindow: function () {
			this.infowindow.close();
		},

		openInfoWindow: function () {
			this.infowindow.open(app.map, this.marker);
		},

		destroy: function () {
			this.marker.setMap(null);
			this.infowindow.setMap(null);
			this.marker = this.infowindow = null;

			this.undelegateEvents();
			this.$el.removeData().unbind();
			this.unbind();
			this.remove();
		},
	});

	var MapsNinjaMarkerView = GenericMapsMarkerView.extend({
		infowindowTemplate: HandleBars.compile($("#ninja-infowindow-template").html()),

		initialize: function () {
			// Use listenTo instead of .on to avoid memory leaks.
			this.listenTo(this.model.collection, 'reset', this.destroy);

			this.marker = new google.maps.Marker();
			google.maps.event.addListener(this.marker, 'click', _.bind(this.click, this));
			
			var lastSaveF, d = new Date()-new Date(this.model.get('lastSave'));
			if (d < 60000) {
				lastSaveF = "menos de um minuto";
			} else {
				lastSaveF = ""+Math.round(d/60000)+" minuto"+(d>=120000?'s':'');
			}

			this.infowindow = new google.maps.InfoWindow({
				maxWidth: 400,
				content: this.infowindowTemplate(_.extend(this.model.toJSON(), {
					vprv_link: "http://vempraruavem.org#ninjas/"+encodeURIComponent(this.model.get('id')),
					lastSaveF: lastSaveF,
					live_viewers_count: this.model.get('live_viewers_count') || 0,
				}))
			});
			google.maps.event.addListener(this.infowindow, 'closeclick', app.unselectAll.bind(app));
		},

		click: function () {
			app.mapsNinjasView.closeInfoWindows();
			app.mapsEventsView.closeInfoWindows();
			this.infowindow.open(app.map, this.marker);
			app.goToNinja(this.model.get('id'));
		},

		render: function () {
			var image = 'static/img/cam1.png';
			this.marker.setOptions({
				position: new google.maps.LatLng(this.model.get('lat'), this.model.get('lng')),
				animation: google.maps.Animation.DROP,
				icon: image,
			});

			return this.marker;
		},
	});

	var MapsEventMarkerView = GenericMapsMarkerView.extend({
		
		infowindowTemplate: HandleBars.compile($("#event-infowindow-template").html()),

		// emphasize: function (id) {
		// 	if (id === this.model.get('id'))
		// 		this.emphasized = true;
		// 	else
		// 		this.emphasized = false;
		// 	this.render();
		// 	!window.logit || console.log('emphasized', this.emphasized)
		// },

		initialize: function () {
			// Use listenTo instead of .on to avoid memory leaks.
			this.listenTo(this.model.collection, 'reset', this.destroy);
			// this.model.collection.on('emphasize', this.emphasize, this)

			this.circle = new google.maps.Circle();
			this.marker = new google.maps.Marker({
				position: new google.maps.LatLng(this.model.get('lat'), this.model.get('lng')),
			});
			this.infowindow = new google.maps.InfoWindow({
				maxWidth: 400,
				content: this.infowindowTemplate({
					id: this.model.get('id'),
					name: this.model.get('name').length>100?this.model.get('name').slice(0,100)+'...':this.model.get('name'),
					date: new Date(this.model.get('start_time')).slashed(),
					time: new Date(this.model.get('start_time')).colon(),
					location: this.model.get('location'),
					count: {
						num: this.model.get('count'),
						sub: this.model.get('count')>10000?'Tá indo gente pra dédéu!':'',
						rank: mm(0,Math.floor(Math.log(this.model.get('count'))/2),7),
					},
					description: this.model.get('description').split(' ').slice(0,20).join(' '),
					reviewed: this.model.get('reviewed'),
					facebookUrl: this.model.get('facebookUrl'),
					url: this.model.get('url'),
				}),
			});

			this.emphasized = false;
			google.maps.event.addListener(this.circle, 'click', _.bind(this.click, this));	
			google.maps.event.addListener(this.marker, 'click', _.bind(this.click, this));	
			google.maps.event.addListener(this.infowindow, 'closeclick', app.unselectAll.bind(app));

		},

		/* This overwrites the parent method, because the infowindow anchor must depend on the which
		is visible (the circle or the marker). */ 
		openInfoWindow: function () {
			if (app.map.getZoom()>13)
				this.infowindow.open(app.map, this.marker);
			else
				this.infowindow.open(app.map, this.circle);
		},


		destroy: function () {
			this.marker.setMap(null);
			this.circle && this.circle.setMap(null);
			this.infowindow.setMap(null);
			this.marker = this.infowindow = null;

			this.undelegateEvents();
			this.$el.removeData().unbind();
			this.unbind();
			this.remove();
		},

		getRadiusFromCount: function(count) {
			/*
			* Reverse the map's zoom calculation function by making the circle's
			* radius-to-screen ratio constant. Then twist the function to make it grow when
			* the zoom gets bigger than 10.
			*/
			var zoom = app.map.getZoom();
			var factor = Math.pow(2,mm(0,zoom-10,10));
			var abs = 1128.497*Math.pow(2,20-zoom); /* natural factor for zooming. don't change */
			var countFact = mm(10,Math.sqrt(count),200); /* factor related to count */
			return abs*factor*countFact*0.00005;
		},

		click: function () {
			app.mapsNinjasView.closeInfoWindows();
			app.mapsEventsView.closeInfoWindows();
			// See this.render()
			this.infowindow.open(app.map, app.map.getZoom()>13?this.marker:this.circle);
			app.goToEvent(this.model.get('id'));
		},

		render: function (zindex) {

			// If the user is close enough, change circle to marker.
			if (app.map.getZoom()>13) {
				/* If infowindow is open, must change anchor, so it will have the right center.
				* Infowindows stay on top of markers, when they're the anchors, but exactly on the
				* center of the circles, when the circles are the anchors. */
				if (this.infowindow.getMap()) {
					this.infowindow.setAnchor(this.marker);
				}
				this.marker.setMap(app.map);
				this.marker.setVisible(true);
				this.circle.setVisible(false);
				return this.marker;
			}

			if (this.infowindow.getMap()) // Explained above.
				this.infowindow.setAnchor(this.circle);

			this.marker.setVisible(false);
			this.circle.setMap(app.map);
			
			// var r = Math.log(this.count);
			// var color = this.model.get('isUserInput')?"#2980b9":"#2ecc71";
			// if (this.model.get('count') > 2000)
			// 	var color = "rgba(200,200,200)";
			// else if (this.model.get('count') > 10000)
			// 	var color = "rgba(200,200,200)";

			function log10(x) { return Math.log(x)/Math.log(10); }

			var r = log10(this.model.get('count'))/6*255,
				g = 255-r*1.1,
				b = 255-r;

			var color = "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
			console.log(color)

			this.circle.setOptions({
				visible: true,
				fillColor: color,
				fillOpacity: this.emphasized?1:(app.map.getZoom()>10?0.5:0.9),
				strokeColor: 'black',
				// strokeOpacity: 0.8,
				strokeWeight: 1*(this.emphasized?2:1),
				radius: this.getRadiusFromCount(this.model.get('count'))*(this.emphasized?1:1),
				zIndex: this.emphasized?1:-this.model.get('count'),

				center: new google.maps.LatLng(this.model.get('lat'), this.model.get('lng')),
				position: new google.maps.LatLng(this.model.get('lat'), this.model.get('lng')), // for windowinfo
			});

			return this.circle;
		},
	});

	/*
	*
	* */
	var GenericMapView = Backbone.View.extend({
		_views: [],
		viewModel: null,

		initialize: function () {
			this.map = app.map;
			this.bindToMaps(this.map);
			this.collection.on('reset', this.render, this);
			app.date.on('change:date', this.onDateChanged, this);
		},

		showView: function (e) {
			this.closeInfoWindows();
			for (var i=0; i<this._views.length; i++) {
				if (this._views[i].model.get('id') === e.get('id')) {
					this._views[i].openInfoWindow();
					break;
				}
			}
		},

		render: function () {
			this._views = [];
			var self = this;
			this.collection.each(function (item) {
				var marker = new this.viewModel({model:item});
				this._views.push(marker);
				marker.render().setMap(this.map);
			},this);
			return this;
		},

		closeInfoWindows: function () {
			_.each(this._views, function (tag) {
				tag.closeInfoWindow();
			});
		},

		bindToMaps: function (map) {
			var self = this;
			// Re-render all markers when zoom changes. Because their radius need to be changed too.
			google.maps.event.addListener(map, 'zoom_changed', function() {
				_.each(self._views, function (marker) {
					marker.render();
				});
			});
		},

		onDateChanged: function (e) {
		}
	});

	var MapsEventsView = GenericMapView.extend({
		viewModel: MapsEventMarkerView,
	});

	var MapsNinjasView = GenericMapView.extend({
		viewModel: MapsNinjaMarkerView,
	});

	// boxes

	var EventList_ItemView = Backbone.View.extend({
		
		tagName: 'li',
		template: Handlebars.compile($('#event-template').html()),
		events: {
			"click": "click",
		// 	'mouseover': 'onMouseOver',
		// 	'mouseout': 'onMouseOut',
		},

		// onMouseOver: function () {
		// 	!window.logit || console.log('mousein', this.model.get('name'))
		// 	this.model.trigger('emphasize', this.model.get('id'));
		// },

		// onMouseOut: function () {
		// 	!window.logit || console.log('mouseout', this.model.get('name'))
		// 	this.model.trigger('emphasize', null);
		// },

		initialize: function () {
			this.prender();
		},

		click: function () {
			app.goToEvent(this.model.get('id'), true);
		},

		prender: function () { /* This must always return this */

			this.$el.html(this.template({
				name: this.model.get('name'),
				count: this.model.get('count'),
				description: this.model.get('description').split(' ').slice(0,10).join(' '),
				date: new Date(this.model.get('start_time')).slashed(),
				time: new Date(this.model.get('start_time')).colon(),
				count: {
					num: this.model.get('count'),
					rank: mm(0,Math.floor(Math.log(this.model.get('count'))/2),7),
				},
				location: this.model.get('location'),
				reviewed: this.model.get('reviewed'),
				link: this.model.get('facebookUrl'),
				sub: this.model.get('count')>10000?'Tá indo gente pra dédéu!':'',
			}));
			this.el.dataset.id = this.model.get('id');
			this.delegateEvents();
			return this;
		},

		eventWithinBounds: function () {
			/* I found this was a better solution than to put this logic inside .render(). */
			var currentBounds = app.map.getBounds();
			/* currentBounds might be undefined if map wasn't initialized yet. */
			if (currentBounds && !(currentBounds.contains(this.model.getLatLng()))) {
				return false;
			}
			return true;
		}
	});

	var EventListView = GenericBoxView.extend({
		
		events: {},
		_views: [],
		el: $("#event-list")[0],
		btn: $("#nav-event-list"),

		initialize: function () {
			this.collection.on('reset', this.prender, this);
			this.collection.on('add', this.prender, this);
			this.prender();

			// Render eventListView when map is location (bounds) are modified.
			google.maps.event.addListener(app.map, 'zoom_changed', this.render.bind(this));
			google.maps.event.addListener(app.map, 'center_changed', this.render.bind(this));
		},

		prender: function () {
			/* Creates all event tags a priori. */
			this._views = [];
			this.collection.each(function (eventItem) {
				this._views.push(new EventList_ItemView({model:eventItem}));
			}, this);
			return this.render();
		},

		render: function () {
			var self = this;
			var container = document.createDocumentFragment();
			if (_.isEmpty(this._views)) {
				$(container).append("<li>Não há eventos listados para esse dia.</li>");
			} else {
				for (var i=0; i<this._views.length; i++) {
					var tagView = this._views[i];
					if (tagView.eventWithinBounds()) {
						tagView.delegateEvents();
						tagView.$el.appendTo(container);
					} else {
						tagView.remove();
					}
				}
				if (container.childElementCount === 0)
					$(container).append("<li>Não há eventos visiveis nessa área do mapa.</li>");
			}
			this.$el.empty().append(container);
		},
	});

	var EventAdderView = GenericBoxView.extend({
		btn: $("#nav-add-event"),
		el: $("#add-event"),
		initialize: function () {
			$("#add-event form").bind('submit', submitEvent);
		}
	});

	var CalendarView = GenericBoxView.extend({
		
		el: $("#calendar"),
		btn: $("#calendar-icon"),
		
		initialize: function () {
			this.model.on('change', this.render, this);
			this.model.on('reset', this.render, this);
			this.render();
			var self = this;
		},

		render: function () {
			var months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

			$("[data-data]").html(months[new Date().getMonth()]+' 2013');

			var days = app.eventList.groupBy(function (model) {
				return new Date(model.get('start_time')).setHours(0,0,0,0);
			});

			var self = this;
	
			function makeDayElement(date) {
				var el = document.createElement('td');
				el.dataset.date = date.valueOf();
				if (date < self.model.get('today')) {
					el.classList.add('bygone');
				} else if (date.sameDate(self.model.get('today'))) {
					el.classList.add('today');
				} else if (date.sameDate(self.model.get('currentDate'))) {
					el.classList.add('current');
				}
				el.innerHTML = date.getDate();
				var circles = $('<div class="circles"></div>').appendTo(el);
				var events = days[1*date];
				if (events) {
					for (var i=0; i<events.length; i++) {
						$("<span><i class='fa fa-circle-o'></i></span>").appendTo(circles);
					}
				}
				return el;
			}

			var nweeks = 0, ndays = 0;
			var actualDay = new Date(this.model.get('today').addDays(-this.model.get('today').getDay())); // Beginning of the week.

			var onClickDate = function (event) {
				var d = new Date(parseInt(this.dataset.date));
				// Disable selecting dates earlier than today.
				if (d < self.model.get('today')) return;
				// If double clicking current date, unbound date.
				if (d.sameDate(self.model.get('currentDate')))
					app.selectDate(null);
				else
					app.selectDate(d);
				self.hide();
			}

			var newContent = document.createDocumentFragment();
			while (nweeks++ < 5) {
				var trEl = document.createElement('tr');
				while (++ndays % 8) {
					var tdEl = makeDayElement(actualDay);
					trEl.appendChild(tdEl);
					actualDay = actualDay.addDays(1);
					$(tdEl).click(onClickDate)
				}
				newContent.appendChild(trEl);
			}

			this.$el.find("table tbody").empty().append(newContent);
			return this;
		}
	});

	var DateDisplayView = Backbone.View.extend({
		
		el: $("#date"),

		initialize: function () {
			this.model.on('change', this.render, this);
			this.model.on('reset', this.render, this);
			this.$el.click(function () { app.toggleBoundDate(); });
			this.render();
			var self = this;
			$("#date-wrapper .arrow[data-action=down]").click(function(event) { app.moveCurrentDate(-1); });
			$("#date-wrapper .arrow[data-action=up]").click(function(event) { app.moveCurrentDate(1); });
		},

		render: function () {
			
			if (this.model.get('currentDate').sameDate(this.model.get('today')))
				$("#date-wrapper").addClass('in-lower-bound');
			else
				$("#date-wrapper").removeClass('in-lower-bound');

			if (this.model.changedAttributes().hasOwnProperty('dateBound')) {
				if (this.model.get('dateBound')) {
					this.$el.addClass('date-bound');
					$("#date").attr('title', 'Você só está vendo eventos desse dia. Clique para desabilitar essa função.').tooltip('fixTitle').tooltip('show');
				} else {
					$("#date").attr('title', 'Clique aqui para ver apenas os eventos desde dia.').tooltip('fixTitle').tooltip('show');
					this.$el.removeClass('date-bound');
				}
			}

			this.$el.find('[data-piece=day]').html((day=this.model.get('currentDate').getDate())<10?'0'+day:day);
			this.$el.find('[data-piece=month]').html(this.model.get('currentDate').getMonth()+1);
			this.$el.find('[data-piece=year]').html((''+this.model.get('currentDate').getFullYear()).slice(0,4));
			return this;
		}
	});

	/* Date model.
	* Central piece for triggering changes in models and views that depend on currently the selected
	* date. */
	var DateInfo = Backbone.Model.extend({
		defaults: {
			today: new Date(new Date().setHours(0,0,0,0)),
			currentDate: new Date(new Date().setHours(0,0,0,0)),
			dateBound: false
		},
		initialize: function () {
		},
		updateCurrentDate: function (d) {
			this.set('dateBound', true);
			// Limit lower-bound for selectable dates.
			this.set('currentDate', new Date(d!==null?Math.max(d.valueOf(),this.get('today').valueOf()):this.get('today').valueOf()));
		},
		toggleBoundDate: function () {
			this.set('dateBound', !this.get('dateBound'));
		},
		moveCurrentDate: function (d) {
			if (typeof d === 'number') { // delta-days
				this.updateCurrentDate(new Date(this.get('currentDate')).addDays(d));
			} else if (d instanceof Date) {
				this.set('currentDate', d);
			} else { // Like there's no current date.
				alert(1); // see this. should it be today or new Date(0)?
				this.set('currentDate', today);
			}
		}
	});

	/*
	* 
	* */

	function submitEvent (event) {
		event.preventDefault();
		
		function resetThis() {
			var form = event.target;
			$(form).stop();
			$(form).find('label.control-label').html('Quer adicionar um evento ao nosso mapa?');
			$(form).find('>button').unbind('click'); // Unbind function to clear input
			form.classList.remove('has-error');
			form.classList.remove('has-success');
			form.classList.remove('has-warning');
			$(form).find('>button').html('<i class="fa fa-check"></i>').addClass('wow').removeClass('bad');
		}
		
		var form = event.target;
		var input = form.querySelector('input[type=text]');
		var match = /(?:events)?\/(\d+)\/?/g.exec(input.value);
		// See if matches, or we're going to use normal.
		$(input).bind('keydown', function (e) {
			if (e.keyCode === 27) {
				resetThis();
				form.classList.add('hid');
			}
		});
		if (!input.value || input.value == '') {
			form.classList.add('has-warning');
			return;
		} else if (!match || match.length < 2) { // Didn't find an id inside an url.
			var id = input.value;
		} else {
			var id = match[1];
		}
		resetThis();
		console.log('Id extracted:', id);

		// So we're doing this → Animate()! \o/
		$(form).find('>button').html('<i class="fa fa-spinner fa-spin"></i>');

		$.ajax({
			url: '/api/events',
			type: 'put', 
			data: {id:id},
			dataType: 'json',
			success: function (data, status, res) {
				console.log('Put request to /api/events was successful', arguments)
				form.classList.add('has-success');
				app._raw_events.push(data);
				app.eventList.reset(app._raw_events);
				if (data.isNew) {
					app.eventListView.render(app.eventList.toJSON());
					$("#countNotice count").html(app.eventList.length);
					$(form).find('label.control-label').html('Sucesso! Evento adicionado. :)');
				} else {
					$(form).find('label.control-label').html('Esse evento já foi adicionado. :O');
				}
				app.goToEvent(data.id, true);
				setTimeout(function () {
					input.value="";
					app.eventAdder.hide();
					resetThis();
				}, 1500);
			},
			error: function (res, err, status) {
				var data = JSON.parse(res.responseText);
				var error = data.message || "Algum erro ocorreu.";
				$(form).find('label.control-label').html('Ops! '+error)
				console.log(res.responseText);
				$(form).find('>button').click(function (event) {
					event.preventDefault();
					input.value="";
					resetThis();
				});
				$(input).bind('keydown change', function (event) { resetThis(); });
				form.classList.add('has-error');
				$(form).find('>button').html('<i class="fa fa-times"></i>');
			}
		});
	}

	// Program google maps to fill screen height.
	function fillScreenGMaps() {
		if ($('body').width()<770)
			$('#map-wrapper').height($(document.body).height()-93);
		else {
			if ($('body').height()<600)
				$('#map-wrapper').height($(document.body).height()-40-2); // $('.navbar').outerHeight() = 40
			else 
				$('#map-wrapper').height($(document.body).height()-40); // $('.navbar').outerHeight() = 40
		}
			
	}
	fillScreenGMaps();
	$(window).resize(fillScreenGMaps);

	window.app = new (Backbone.Router.extend({
		geoLocate: function (zoom) {
			var self = this;
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (pos) {
					var coord = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
					self.map.setCenter(coord); // self.map.setZoom(zoom || 4)
				});
			}
		},

		initialize: function () {
			// Initialize Maps object.
			this.map = new google.maps.Map(document.getElementById("map"), {
				center: new google.maps.LatLng(-14.656, -52.09), // The center magic numbers are BR's non-exact center coordinates.
				zoom: 5,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_CENTER }
			});

			// this.geoLocate();
			$("[data-action=geolocate]").click(_.bind(this.geoLocate, this, 9));

			this.date = new DateInfo();
			this.eventList = new EventList();
			this.ninjaList = new NinjaList();

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

			this.eventListView = new EventListView({collection: this.eventList});
			this.mapsEventsView = new MapsEventsView({collection: this.eventList});
			this.mapsNinjasView = new MapsNinjasView({collection: this.ninjaList});
			
			this.calendarView = new CalendarView({model:this.date});
			this.dateDisplayView = new DateDisplayView({model:this.date});
			this.eventAdder = new EventAdderView();

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
	}));
	app.start();

	/* Listen for <ESC> while inputting event. Quit if so. */
	$(document).keyup(function(e){
		if(e.keyCode === 27 && $('#add-event').is(':visible'))
			$("#add-event").fadeOut();
	});

});
