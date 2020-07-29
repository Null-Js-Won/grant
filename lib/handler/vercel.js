
var qs = require('qs')
var Grant = require('../grant')
var Session = require('../session')


module.exports = function (args = {}) {
  var grant = Grant(args.config ? args : {config: args})
  app.config = grant.config

  var regex = new RegExp([
    '^',
    app.config.defaults.prefix,
    /(?:\/([^\/\?]+?))/.source, // /:provider
    /(?:\/([^\/\?]+?))?/.source, // /:override?
    /(?:\/$|\/?\?+.*)?$/.source, // querystring
  ].join(''), 'i')

  var store = Session({...args.session, handler: 'vercel'})

  async function app (req, res, state) {
    var session = store(req, res)
    var match = regex.exec(req.url)
    if (!match) {
      return {session}
    }

    if (!session) {
      throw new Error('Grant: session store is required')
    }

    var {location, session:sess, state} = await grant({
      method: req.method,
      params: {provider: match[1], override: match[2]},
      query: qs.parse(req.query),
      body: req.body,
      state,
      session: (await session.get()).grant
    })

    await session.set({grant: sess})

    return location
      ? (redirect(res, location), {session, redirect: true})
      : {session, response: state.response || sess.response}
  }

  return app
}

var redirect = (res, location) => {
  res.statusCode = 302
  res.setHeader('location', location)
  res.end()
}
