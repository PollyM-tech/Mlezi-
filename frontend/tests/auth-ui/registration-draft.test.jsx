import {afterEach,expect,it,vi} from 'vitest'
import{saveRegistrationDraft,readRegistrationDraft,clearRegistrationDraft}from'../../src/lib/registrationDraft.js'
afterEach(()=>{sessionStorage.clear();localStorage.clear();vi.restoreAllMocks()})
it('restores a new-tab draft only for the verified email, with expiry and cleanup',()=>{
 saveRegistrationDraft({role:'employer',name:'Example',phone:'0712345678',email:'parent@example.test'})
 sessionStorage.clear()
 expect(readRegistrationDraft('other@example.test')).toEqual({})
 expect(readRegistrationDraft()).toEqual({})
 expect(readRegistrationDraft('parent@example.test')).toMatchObject({role:'employer',phone:'0712345678'})
 const expires=JSON.parse(localStorage.getItem('mlezi-registration-draft')).expiresAt
 vi.spyOn(Date,'now').mockReturnValue(expires+1)
 expect(readRegistrationDraft('parent@example.test')).toEqual({})
 expect(localStorage.getItem('mlezi-registration-draft')).toBeNull()
})
it('clears both draft copies after account creation or logout',()=>{
 saveRegistrationDraft({role:'caregiver',name:'Example',phone:'0712345678',email:'care@example.test'})
 clearRegistrationDraft('other@example.test')
 expect(sessionStorage.getItem('mlezi-registration-draft')).not.toBeNull()
 clearRegistrationDraft('care@example.test')
 expect(sessionStorage.getItem('mlezi-registration-draft')).toBeNull()
 expect(localStorage.getItem('mlezi-registration-draft')).toBeNull()
})

it('keeps Google signup consent in the originating tab without trusting a cross-tab unknown email',()=>{
 saveRegistrationDraft({role:'caregiver',name:'Njeri',phone:'0712345678',email:'',provider:'google',adultConfirmed:true,termsAccepted:true})
 expect(readRegistrationDraft('selected-google@example.test')).toMatchObject({termsAccepted:true,adultConfirmed:true})
 sessionStorage.clear()
 expect(readRegistrationDraft('selected-google@example.test')).toEqual({})
})
