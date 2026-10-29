import { httpRouter } from 'convex/server'
import { upload, document, options } from './files.js'
import { httpAction } from './_generated/server.js'
import { api } from './_generated/api.js'
import { auth } from './auth.js'

const http = httpRouter()
auth.addHttpRoutes(http)
http.route({ path: '/health', method: 'GET', handler: httpAction(async ctx => Response.json(await ctx.runQuery(api.health.status, {}), { headers: { 'Cache-Control': 'no-store' } })) })
http.route({ path: '/files/upload', method: 'POST', handler: upload })
http.route({ path: '/files/upload', method: 'OPTIONS', handler: options })
http.route({ path: '/files/document', method: 'GET', handler: document })
http.route({ path: '/files/document', method: 'OPTIONS', handler: options })
export default http
