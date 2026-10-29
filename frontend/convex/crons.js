import { cronJobs } from 'convex/server'
import { internal } from './_generated/api.js'
const crons = cronJobs()
crons.daily('privacy and security retention', { hourUTC: 1, minuteUTC: 0 }, internal.retention.sweep, {})
export default crons
