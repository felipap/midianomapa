
module.exports = function(grunt) {
	'use strict';

	// 1. All configuration goes here 
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// Media files
		concat: {
			build: {
				src: [
					'src/static/js/lib/plugins.js',
					'src/static/js/lib/main.js',
				],
				dest: 'src/static/js/main.js',
			}
		},
 
		uglify: {
			build: {
				src: 'src/static/js/main.js',
				dest: 'src/static/js/main.min.js'
			}
		},
		
		less: {
			build: {
				files: {
					'src/static/css/main.min.css':		'src/static/less/main.less',
					'src/static/css/mobile.min.css':	'src/static/less/mobile.less',
				},
				options: { cleancss: true },
			},
		},
		
		coffee: {
			options: {
				bare: true,
			},
			glob_to_multiple: {
				expand: true,
				src: ['src/**/*.coffee','tasks/**/*.coffee'],
				ext: '.js'
			}
		},

		// Higher-lever configuration
		watch: {
			options: {
				// livereload: true,
				atBegin: true
			},
			// Beware of the infinite loop
			scripts: {
				files: ['src/static/js/lib/*.js'],
				tasks: ['dist-static-js'],
				options: { spawn: false },
			},
			css: {
				files: ['src/static/**/*.less'],
				tasks: ['less'],
				options: { spawn: false },
			},
			coffee: {
				files: ['**/*.coffee'],
				tasks: ['dist-coffee'],
				options: { spawn: false },
			},
		},

		nodemon: {
			dev: {
				options: {
					file: 'src/app.js',
					args: ['dev'],
					nodeArgs: ['--debug'],
					ignoredFiles: ['node_modules/**','src/static/**'],
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
			}
		},
	});

	// 3. Where we tell Grunt we plan to use this plug-in.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-nodemon');

	grunt.registerTask('dist-coffee', ['coffee']);
	grunt.registerTask('dist-static-js', ['concat', 'uglify']);

	// 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
	grunt.registerTask('default', ['watch']);
	grunt.registerTask('serve', ['nodemon']);
};
