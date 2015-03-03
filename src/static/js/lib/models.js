
var Backbone = require('backbone')

var NinjaItem = Backbone.Model.extend({
  initialize: function () {},
});

var NinjaList = Backbone.Collection.extend({
  model: NinjaItem,
  url: '/api/ninjas',
  comparator: 'live_viewers_count',
});

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

module.exports = {
  NinjaItem: NinjaItem,
  NinjaList: NinjaList,
  EventItem: EventItem,
  EventList: EventList,
  Date: DateInfo,
}