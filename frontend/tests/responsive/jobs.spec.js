import {test,expect} from '@playwright/test'
test('job posting, applicant review, offers and visibility controls fit phone and desktop screens',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 const fits=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1)
 for(const screen of ['jobs-employer','jobs-caregiver','workspace']){
  await page.goto(`/tests/responsive/index.html?screen=${screen}`)
  await expect(page.locator('h1').first()).toBeVisible();await expect(page.locator('.spinner')).toHaveCount(0)
  if(screen==='jobs-employer'){
   await page.getByText('Post a care job',{exact:true}).click();await expect(page.getByRole('button',{name:'Publish job'})).toBeVisible();await fits()
   await page.getByRole('button',{name:'Weekday newborn care and family support',exact:true}).first().click()
   await expect(page.getByText('Identity unverified',{exact:true})).toBeVisible()
   await expect(page.getByText('Identity verified',{exact:true})).toBeVisible()
  }else if(screen==='jobs-caregiver'){
   await page.getByRole('button',{name:'Weekday newborn care and family support',exact:true}).first().click()
   await expect(page.getByRole('button',{name:'Accept offer',exact:true})).toBeVisible()
  }else await expect(page.getByRole('button',{name:'Hide my profile from the marketplace'})).toBeVisible()
  await fits();expect(errors).toEqual([])
 }
})
