
var TagItem = Backbone.Model.extend({
	urlRoot: '/api/tags',

	initialize: function () {
		this.children = new TagList;
		this.collection.on('reset', this.loadChildren, this);
	},
	toggleChecked: function () {
		if (this.get('checked') === 'true') {
			this.set({'checked': 'false'});
		} else {
			this.set({'checked': 'true'});
		}
		this.save();
	},
	loadChildren: function () {
		this.children = new TagList;
		this.children.reset(this.get('children'));
		// console.log('hi, loading children', this.children, this.get('children'));
	},
});

var TagList = Backbone.Collection.extend({
	model: TagItem,
	url: '/api/tags',
	initialize: function () {
		this.on({'reset': this.onReset});
	},
	onReset: function() {
		this.each(function(t){t.loadChildren();});
	}
});


// <div>
// 	<button name="{{key}}"
// 	{% if loop.key|in(user.tags) %}
// 			class="btn tag-btn btn-info tg-btn" data-checked=true><div class="tg icon-check-sign">
// 	{% else %}
// 			class="btn tag-btn btn-default tg-btn" data-checked=false><div class="tg icon-check-empty">
// 	{% endif %}
// 	</div>
// 		{{tag.label}}
// 		<!-- <i class="icon-collapse"></i> -->
// 	</button>
// 	{% if not tag.children|isEmpty %}
// 		<button onClick="return false" class="btn-reset">
// 			<i class="icon-angle-down"></i>
// 		</button>
// 		<ul style="list-style: none">
// 			<div class="children">
// 			{% for ctag in tag.children %}
// 				<button class="btn btn-default" name="{{tag+":"+loop.key}}">
// 					<li><i class="icon-circle"></i> {{ctag.label}}</li>
// 				</button>
// 			{% endfor %}
// 			</div>
// 		</ul>
// 	{% endif %}
// 	<!-- icon-circle icon-circle-blank -->
// </div>

var TagView = Backbone.View.extend({
	className: 'tag',
	/// tagname: 'li',
	id: 'todo-view',

	template: _.template(['<li>',
		'<button class="btn tag-btn btn-default\
			<% if (checked === "true") { %> data-checked=true" <% } else { %> print("data-checked=false") <% } %> >',
		'<%= label %>',
		'</button>',
		'</li>'].join('')),
	
	initialize: function () {
		// this.model.on(change, this.render, this);
		// this.collection.on('add', this.addOne, this);
		this.childrenView = new TagListView({collection: this.model.children});
	},

	render: function () {
		var attributes = this.model.toJSON();
		this.$el.html(this.template(attributes));
		this.model.children.each(function (c) {
			// c.render();
			// this.$el.append(c.$e);
		});
		// this.model.children.each(function(e){e.render();})
		return this;
	},

	// addOne: function () {
	// 	console.log('this was called (TagView.addOne) ')
	// 	// var fV = new 
	// },
	
	// events: {
	// 	"click li":		"alertClick",
	// 	"change input":	"toggleChecked",
	// },

	// toggleChecked: function (e) {
	// 	this.model.toggleChecked();
	// }
});

var TagListView = Backbone.View.extend({
	tagName: "ul",
// 	template: _.template()
	
	initialize: function () {
		this.collection.on('reset', this.addAll, this);
//		this.on('add', this.addOne, this);
		$("fieldset").append(this.el);
	},
	
	render: function () {
		this.addAll();
	},

	addAll: function () {
		this.collection.each(this.addOne, this);
	},
	
	addOne: function (tagItem) {
		console.log('rendering one', tagItem)
		var tagView = new TagView({model:tagItem});
		this.$el.append(tagView.render().el);
	},
});

var tagList = new TagList;
var tagListView = new TagListView({collection: tagList});

tagList.fetch({reset:true});

tagListView.render();
console.log(tagListView.el);

var app = new (Backbone.Router.extend({
	routes: {
		"": "index",
	},
	initialize: function () {
		console.log('tá');
	},
	start: function () {
		Backbone.history.start({pushState: true});
	},
	index: function () {
		console.log('oi');
	},
}));

$(function () {
	app.start();
});