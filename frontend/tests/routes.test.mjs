import {test} from 'node:test'
import assert from 'node:assert/strict'
import {APP_PATHS,appHref,appRoute} from '../src/lib/routes.js'
import {entryRoute} from '../src/lib/public-pages.js'
test('clean application URLs resolve on direct visits and preserve filters',()=>{
 for(const pathname of Object.keys(APP_PATHS))assert.deepEqual(entryRoute({pathname}),{private:true})
 assert.equal(appRoute({pathname:'/caregiver'}),'#/join?role=caregiver')
 assert.equal(appRoute({pathname:'/employer/',search:'?role=caregiver'}),'#/join?role=employer')
 assert.equal(appRoute({pathname:'/caregivers',search:'?category=travel_nanny'}),'#/browse?category=travel_nanny')
 assert.equal(appRoute({pathname:'/caregivers/abc123'}),'#/caregivers/abc123')
 assert.equal(appRoute({pathname:'/unknown'}),null)
})
test('old URLs redirect to clean destinations without dropping auth codes or search',()=>{
 assert.deepEqual(entryRoute({pathname:'/app/',hash:'#/join?role=caregiver'}),{redirect:'/caregiver'})
 assert.deepEqual(entryRoute({pathname:'/app/',search:'?code=example',hash:'#/signin'}),{redirect:'/signin?code=example'})
 assert.equal(appHref('#/caregivers/abc123'),'/caregivers/abc123')
 assert.equal(appHref('#/browse?category=nanny'),'/caregivers?category=nanny')
 assert.equal(appHref('#/support'),'/tickets')
 assert.equal(appHref('#/unknown'),null)
})
