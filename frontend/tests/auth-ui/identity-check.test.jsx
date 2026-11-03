import { it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IdentityCheck from '../../src/components/IdentityCheck.jsx'
const mocks=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('../../src/lib/api',()=>({api:mocks.api}))
afterEach(()=>{cleanup();mocks.api.mockReset()})
it('offers both ID and selfie when an existing caregiver has no stored ID',async()=>{
 const user=userEvent.setup()
 mocks.api.mockResolvedValue({verification_status:'unverified'})
 render(<IdentityCheck profile={{id:'caregiver',national_id_uploaded:false}} onChanged={()=>{}}/> )
 const id=await screen.findByLabelText('National ID image'),selfie=screen.getByLabelText('A clear, recent selfie')
 await user.upload(id,new File(['id'],'id.png',{type:'image/png'}))
 await user.upload(selfie,new File(['selfie'],'selfie.png',{type:'image/png'}))
 fireEvent.click(screen.getByRole('checkbox'))
 fireEvent.submit(screen.getByRole('button',{name:'Submit identity check'}).closest('form'))
 await waitFor(()=>expect(mocks.api).toHaveBeenCalledWith('/verification/submit',expect.objectContaining({method:'POST',body:expect.any(FormData)})))
 expect(mocks.api.mock.calls.at(-1)[1].body.get('national_id').name).toBe('id.png')
 expect(mocks.api.mock.calls.at(-1)[1].body.get('selfie').name).toBe('selfie.png')
})
it('an approved caregiver is told the check is one-time and is not asked to resubmit',async()=>{
 mocks.api.mockResolvedValue({verification_status:'verified'})
 render(<IdentityCheck profile={{id:'caregiver',national_id_uploaded:true}} onChanged={()=>{}}/> )
 await screen.findByText('Your identity has been checked.')
 expect(screen.queryByLabelText('A clear, recent selfie')).toBeNull()
 expect(screen.getByText(/Approved identity checks are one-time/)).toBeTruthy()
})
it('shows the review timeframe while pending without offering duplicate submission or claiming approval',async()=>{
 mocks.api.mockResolvedValue({verification_status:'pending'})
 render(<IdentityCheck profile={{id:'caregiver',national_id_uploaded:true}} onChanged={()=>{}}/>)
 await screen.findByText(/Your documents have been submitted/)
 expect(screen.getByRole('status').textContent).toContain('about 24 hours')
 expect(screen.getByRole('status').textContent).toContain('not verified until approval')
 expect(screen.queryByRole('button',{name:'Submit identity check'})).toBeNull()
 expect(screen.getByRole('link',{name:'Contact support about your identity review'}).getAttribute('href')).toBe('/tickets')
})
it('offers missing-ID recovery even if an older account still carries an approved status',async()=>{
 mocks.api.mockResolvedValue({verification_status:'verified'})
 render(<IdentityCheck profile={{id:'legacy',photo_url:'/fixture-photo.png',national_id_uploaded:false}} onChanged={()=>{}}/> )
 expect(await screen.findByLabelText('National ID image')).toBeTruthy()
 expect(screen.getByLabelText('A clear, recent selfie')).toBeTruthy()
 expect(screen.getByText(/Your profile is hidden from employer listings/)).toBeTruthy()
 expect(screen.getByRole('link',{name:'Upload or change profile photo'}).getAttribute('href')).toBe('/workspace?edit=profile')
})
