import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConvexAuthForm from '../../src/components/ConvexAuthForm.jsx'

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), settings: { emailReady: true } }))
vi.mock('@convex-dev/auth/react', () => ({ useAuthActions: () => ({ signIn: mocks.signIn }) }))
vi.mock('convex/react', () => ({ useQuery: () => mocks.settings }))
beforeEach(() => { mocks.signIn.mockReset().mockResolvedValue({ signingIn: false }); mocks.settings = { emailReady: true }; sessionStorage.clear() })
afterEach(cleanup)

it('password signup collects role details, then verifies the email code', async () => {
  const user = userEvent.setup()
  render(<ConvexAuthForm initialRegistering initialRole="employer" />)
  await user.type(screen.getByLabelText('Your full name'), 'Parent Name')
  await user.type(screen.getByLabelText('Contact phone'), '0712345678')
  await user.type(screen.getByLabelText('Email address'), 'PARENT@example.test')
  await user.type(screen.getByLabelText('Password'), 'Testing123!')
  await user.click(screen.getByRole('button', { name: 'Create account →' }))
  expect(mocks.signIn).toHaveBeenCalledWith('password', expect.objectContaining({ email: 'parent@example.test', flow: 'signUp' }))
  expect(JSON.parse(sessionStorage.getItem('mlezi-registration-draft')).role).toBe('employer')
  expect(sessionStorage.getItem('mlezi-registration-draft')).not.toContain('Testing123!')
  await user.type(screen.getByLabelText(/Email verification code/), '12345678')
  mocks.signIn.mockResolvedValueOnce({ signingIn: true })
  await user.click(screen.getByRole('button', { name: 'Verify code & continue' }))
  expect(mocks.signIn).toHaveBeenLastCalledWith('password', expect.objectContaining({ flow: 'email-verification', code: '12345678' }))
})

it('magic-link and OTP choices request the right methods and show retry paths', async () => {
  const user = userEvent.setup()
  render(<ConvexAuthForm />)
  await user.selectOptions(screen.getByLabelText('How would you like to continue?'), 'magic')
  await user.type(screen.getByLabelText('Email address'), 'person@example.test')
  await user.click(screen.getByRole('button', { name: 'Send magic link' }))
  expect(mocks.signIn).toHaveBeenCalledWith('magic-link', expect.objectContaining({ redirectTo: 'http://localhost:5173/signin' }))
  expect(screen.getByText(/Check your email for a sign-in link/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Use another sign-in method' }))
  await user.selectOptions(screen.getByLabelText('How would you like to continue?'), 'otp')
  await user.click(screen.getByRole('button', { name: 'Send email code' }))
  await user.type(screen.getByLabelText(/Email verification code/), '00000000')
  mocks.signIn.mockRejectedValueOnce(new Error('Could not verify code'))
  await user.click(screen.getByRole('button', { name: 'Verify code & continue' }))
  expect(screen.getByRole('alert').textContent).toContain('invalid or expired')
  await user.click(screen.getByRole('button', { name: 'Resend code' }))
  expect(mocks.signIn).toHaveBeenLastCalledWith('email-otp', expect.objectContaining({ email: 'person@example.test' }))
})

it('forgot-password verifies a code and rejects mismatched new passwords', async () => {
  const user = userEvent.setup()
  render(<ConvexAuthForm />)
  await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
  await user.type(screen.getByLabelText('Email address'), 'person@example.test')
  await user.click(screen.getByRole('button', { name: 'Send reset code' }))
  expect(mocks.signIn).toHaveBeenCalledWith('password-recovery', expect.objectContaining({ flow: 'reset' }))
  await user.type(screen.getByLabelText(/Email verification code/), '12345678')
  await user.type(screen.getByLabelText('New password'), 'NewPassword123!')
  await user.type(screen.getByLabelText('Confirm new password'), 'WrongPassword123!')
  await user.click(screen.getByRole('button', { name: 'Set new password' }))
  expect(screen.getByRole('alert').textContent).toContain('do not match')
  await user.clear(screen.getByLabelText('Confirm new password'))
  await user.type(screen.getByLabelText('Confirm new password'), 'NewPassword123!')
  mocks.signIn.mockResolvedValueOnce({ signingIn: true })
  await user.click(screen.getByRole('button', { name: 'Set new password' }))
  expect(mocks.signIn).toHaveBeenLastCalledWith('password', expect.objectContaining({ flow: 'reset-verification', newPassword: 'NewPassword123!', code: '12345678' }))
})

it('unconfigured email delivery disables submission with a clear message', () => {
  mocks.settings = { emailReady: false }
  render(<ConvexAuthForm />)
  expect(screen.getByRole('status').textContent).toContain('being set up')
  expect(screen.getByRole('button', { name: 'Sign in →' }).disabled).toBe(true)
})

it('explains the shared test-sender limitation and preserves structured delivery errors', async () => {
 const user=userEvent.setup()
 mocks.settings={emailReady:true,testSender:true}
 render(<ConvexAuthForm />)
 expect(screen.getByRole('status').textContent).toContain('test mode')
 await user.selectOptions(screen.getByLabelText('How would you like to continue?'),'otp')
 await user.type(screen.getByLabelText('Email address'),'person@example.test')
 mocks.signIn.mockRejectedValueOnce({data:{message:'Use the email address used for the Resend account.'}})
 await user.click(screen.getByRole('button',{name:'Send email code'}))
 expect(screen.getByRole('alert').textContent).toContain('Resend account')
})
