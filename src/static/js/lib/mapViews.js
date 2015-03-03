
var Backbone = require('backbone')
var Handlebars = require('handlebars')

function mm(min, num, max) {
  return Math.max(min, Math.min(num, max));
}

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

  initialize: function () {
    // Use listenTo instead of .on to avoid memory leaks.
    this.infowindowTemplate = Handlebars.compile($("#ninja-infowindow-template").html());
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


  // emphasize: function (id) {
  //  if (id === this.model.get('id'))
  //    this.emphasized = true;
  //  else
  //    this.emphasized = false;
  //  this.render();
  //  !window.logit || console.log('emphasized', this.emphasized)
  // },

  initialize: function () {
    this.infowindowTemplate = Handlebars.compile($("#event-infowindow-template").html());
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
    //  var color = "rgba(200,200,200)";
    // else if (this.model.get('count') > 10000)
    //  var color = "rgba(200,200,200)";

    function log10(x) { return Math.log(x)/Math.log(10); }

    var r = log10(this.model.get('count'))/6*255,
      g = 255-r*1.1,
      b = 255-r;

    var color = "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
    // console.log(color)

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

module.exports = {
  Events: MapsEventsView,
  Ninjas: MapsNinjasView,
}