import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LegalPage from '../../src/components/LegalPage.jsx'
import { legalConfiguration } from '../../src/lib/legal.js'

afterEach(() => { cleanup(); vi.unstubAllEnvs() })
it('identifies Mlezi as a Lintech Telecom project and registered sole proprietorship without draft labels', () => {
  vi.stubEnv('VITE_LEGAL_ENTITY', 'Lintech Telecom')
  vi.stubEnv('VITE_LEGAL_REVIEWED', 'true')
  vi.stubEnv('VITE_LEGAL_STRUCTURE', '')
  vi.stubEnv('VITE_LEGAL_SERVICE_ADDRESS', '')
  render(<LegalPage type="terms" />)
  expect(screen.queryByText('Pre-launch draft')).toBeNull()
  expect(screen.getByText('Lintech Telecom')).toBeTruthy()
  expect(screen.getByText(/Mlezi is a project operated by Lintech Telecom/)).toBeTruthy()
  expect(screen.getByText('Registered sole proprietorship')).toBeTruthy()
  expect(screen.queryByText(/to be confirmed/i)).toBeNull()
  expect(screen.getByText(/Mlezi does not currently recruit or place workers/)).toBeTruthy()
  expect(screen.getByText(/Manual Paybill receipt submissions and Paystack checkout are unavailable/)).toBeTruthy()
  expect(screen.queryByRole('link', { name: /@/ })).toBeNull()
})
it('describes ID contents truthfully and links independent privacy complaints', () => {
  render(<LegalPage type="privacy" />)
  expect(screen.getByText(/We do not extract or save the ID number as a text field/)).toBeTruthy()
  expect(screen.getByRole('link', { name: /file a complaint/ }).href).toBe('https://www.odpc.go.ke/file-a-complaint/')
  expect(screen.getByText(/statutory privacy-request deadlines remain separate/)).toBeTruthy()
  expect(screen.getByText(/schedule is not yet finalized/)).toBeTruthy()
})
it('distinguishes operator particulars from actual review attestation', () => {
  const configured = { VITE_LEGAL_PROPRIETOR: 'Supplied proprietor', VITE_LEGAL_SERVICE_ADDRESS: 'Supplied public service address' }
  expect(legalConfiguration(configured).reviewed).toBe(false)
  expect(legalConfiguration({ ...configured, VITE_LEGAL_REVIEWED: 'true' }).reviewed).toBe(true)
  expect(legalConfiguration({ VITE_LEGAL_REVIEWED: 'true' }).reviewed).toBe(false)
})
