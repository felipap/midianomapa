
module.exports = function(grunt) {
	'use strict';

	// 1. All configuration goes here
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		less: {
			build: {
				files: {
					'src/static/css/main.min.css':		'src/static/less/main.less',
					'src/static/css/mobile.min.css':	'src/static/less/mobile.less',
				},
				options: { cleancss: true },
			},
		},

		browserify: {
			// prod: {
			// 	files: {
			// 		"app/static/js/app.min.js": "app/static/js/app.js",
			// 	},
			// 	options: {
			// 		preBundleCB: function (b) {
			// 			b.plugin('minifyify', {
			// 				compressPath: function (p) {
			// 					return require('path').relative(__dirname, p);
			// 				},
			// 			});
			// 			return b;
			// 		},
			// 		watch: false,
			// 		browserifyOptions: {
			// 			debug: true,
			// 		},
			// 	},
			// 	bundleOptions: {
			// 		debug: true,
			// 	},
			// },
			dev: {
				files: {
					"src/static/js/main.min.js": "src/static/js/main.js",
				},
			},
			options: {
				transform: [ ],
				watch: true,
				keepAlive: true,
			}
		},
		// Higher-lever configuration
		watch: {
			options: {
				// livereload: true,
				atBegin: true
			},
			// Beware of the infinite loop
			css: {
				files: ['src/static/**/*.less'],
				tasks: ['less'],
				options: { spawn: false },
			},
		},

		nodemon: {
			server: {
				options: {
					file: 'master.js',
					args: ['dev'],
					nodeArgs: ['--debug'],
					ignoredFiles: ['node_modules/**','src/static/**', 'src/views/**'],
					// watchedExtensions: ['js','css'],
					watchedFolders: ['src'],
					delayTime: 1,
					legacyWatch: true,
					cwd: __dirname
				}
			},
		},
		concurrent: {
			dev: {
				tasks: ['nodemon', 'watch'], // +? 'node-inspector'
				options: {
					logConcurrentOutput: true
				}
			},
			watch: {
				tasks: ['browserify:dev', 'watch'],
				options: {
					logConcurrentOutput: true
				}
			}
		},
	});

	// 3. Where we tell Grunt we plan to use this plug-in.
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-nodemon');

	// 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
	grunt.registerTask('default', ['watch']);
	grunt.registerTask('serve', ['nodemon:server']);
};
