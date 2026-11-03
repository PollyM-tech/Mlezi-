import { cronJobs } from 'convex/server'
import { internal } from './_generated/api.js'
const crons = cronJobs()
crons.daily('privacy and security retention', { hourUTC: 1, minuteUTC: 0 }, internal.retention.sweep, {})
crons.interval('reconcile pending STK payments', { minutes: 2 }, internal.mpesa.sweep, {})
export default crons
