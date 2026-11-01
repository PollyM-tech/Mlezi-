import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LegalPage from '../../src/components/LegalPage.jsx'
import { legalConfiguration } from '../../src/lib/legal.js'

afterEach(() => { cleanup(); vi.unstubAllEnvs() })
it('keeps Lintech Telecom notices visibly draft until particulars AND review are complete', () => {
  vi.stubEnv('VITE_LEGAL_ENTITY', 'Lintech Telecom')
  vi.stubEnv('VITE_LEGAL_REVIEWED', 'true')
  vi.stubEnv('VITE_LEGAL_STRUCTURE', '')
  vi.stubEnv('VITE_LEGAL_SERVICE_ADDRESS', '')
  render(<LegalPage type="terms" />)
  expect(screen.getByText('Pre-launch draft')).toBeTruthy()
  expect(screen.getByText('Lintech Telecom')).toBeTruthy()
  expect(screen.getByText(/Mlezi does not currently recruit or place workers/)).toBeTruthy()
  expect(screen.getByText(/Automated Paystack checkout is not enabled/)).toBeTruthy()
  expect(screen.queryByRole('link', { name: /@/ })).toBeNull()
})
it('describes ID contents truthfully and links independent privacy complaints', () => {
  render(<LegalPage type="privacy" />)
  expect(screen.getByText(/retained ID image can still contain the birth date and ID number/)).toBeTruthy()
  expect(screen.getByRole('link', { name: /file a complaint/ }).href).toBe('https://www.odpc.go.ke/file-a-complaint/')
  expect(screen.getByText(/statutory privacy-request deadlines remain separate/)).toBeTruthy()
  expect(screen.getByText(/schedule is not yet finalized/)).toBeTruthy()
})
it('distinguishes operator particulars from actual review attestation', () => {
  const configured = { VITE_LEGAL_ENTITY: 'Lintech Telecom', VITE_LEGAL_STRUCTURE: 'Supplied structure', VITE_LEGAL_SERVICE_ADDRESS: 'Supplied public service address' }
  expect(legalConfiguration(configured).reviewed).toBe(false)
  expect(legalConfiguration({ ...configured, VITE_LEGAL_REVIEWED: 'true' }).reviewed).toBe(true)
  expect(legalConfiguration({ VITE_LEGAL_REVIEWED: 'true' }).reviewed).toBe(false)
})
