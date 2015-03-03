
var Backbone = require('backbone')
var Handlebars = require('handlebars')

function mm(min, num, max) {
  return Math.max(min, Math.min(num, max));
}

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

var EventList_ItemView = Backbone.View.extend({

  tagName: 'li',
  events: {
    "click": "click",
  //  'mouseover': 'onMouseOver',
  //  'mouseout': 'onMouseOut',
  },

  // onMouseOver: function () {
  //  !window.logit || console.log('mousein', this.model.get('name'))
  //  this.model.trigger('emphasize', this.model.get('id'));
  // },

  // onMouseOut: function () {
  //  !window.logit || console.log('mouseout', this.model.get('name'))
  //  this.model.trigger('emphasize', null);
  // },

  initialize: function () {
    this.template = Handlebars.compile($('#event-template').html());
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
    $(".navbar-date .arrow[data-action=down]").click(function(event) { app.moveCurrentDate(-1); });
    $(".navbar-date .arrow[data-action=up]").click(function(event) { app.moveCurrentDate(1); });
  },

  render: function () {

    if (this.model.get('currentDate').sameDate(this.model.get('today')))
      $(".navbar-date").addClass('in-lower-bound');
    else
      $(".navbar-date").removeClass('in-lower-bound');

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

module.exports = {
  EventListView: EventListView,
  EventAdderView: EventAdderView,
  CalendarView: CalendarView,
  DateDisplayView: DateDisplayView,
}