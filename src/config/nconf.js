
// Initialize nconf for the app.

var path = require('path')
var nconf = require('nconf')

nconf.argv().env()

nconf.use('memory')

if (nconf.get('NODE_ENV') !== 'production') {
  nconf.file({file: __dirname+'/env.json'})
  nconf.set('env', 'development')
} else {
  nconf.set('env', 'production')
}

var srcDir = path.join(path.dirname(module.parent.filename), 'src')
nconf.set('appRoot', srcDir)
nconf.set('staticUrl', '/static/')
nconf.set('staticRoot', path.join(srcDir, '/static'))
nconf.set('viewsRoot', path.join(srcDir, 'views'))

nconf.defaults({
  port: 3000,
})

module.exports = nconf