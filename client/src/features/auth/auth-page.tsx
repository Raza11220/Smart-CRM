import { useState } from 'react'
import { dateKey } from '../../lib/localization'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Layers2, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useCRM } from '../../store/crm-store'
import { useAuth } from '../../store/auth-store'
import { Button } from '../../components/ui/primitives'
import { authService } from './auth-service'
import { API_MODE } from '../../lib/runtime'

export default function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data, save } = useCRM()
  const signIn = useAuth(s => s.signIn)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [resetNotice, setResetNotice] = useState(false)
  const schema = z.object({ name: mode === 'register' ? z.string().trim().min(2, 'Enter your full name') : z.string().optional(), email: z.email('Please enter a valid email address'), password: mode === 'forgot' ? z.string().optional() : z.string().min(mode === 'register' && API_MODE ? 12 : 8, API_MODE && mode === 'register' ? 'Use at least 12 characters' : 'Use at least 8 characters').refine(v => mode !== 'register' || (/[A-Z]/.test(v) && /[0-9]/.test(v) && /[^a-zA-Z0-9]/.test(v)), 'Add an uppercase letter, a number, and a symbol') })
  type Values = z.infer<typeof schema>
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } })
  async function submit(values: Values) {
    setError('')
    if (mode === 'forgot') { setResetNotice(true); return }
    try {
      if (API_MODE) {
        if (mode === 'register') await useAuth.getState().register(values.name || '', values.email.toLowerCase(), values.password || '')
        else await useAuth.getState().login(values.email.toLowerCase(), values.password || '', remember)
        await useCRM.getState().refresh()
        toast.success('Signed in successfully')
      } else if (mode === 'register') {
        if (data.employees.some(e => e.email.toLowerCase() === values.email.toLowerCase())) { setError('This email is already in the demo workspace. Please sign in.'); return }
        const id = `employee-${crypto.randomUUID()}`
        const email = values.email.toLowerCase()
        await save('employees', { id, name: values.name || '', email, role: 'Staff', jobTitle: 'Sales Executive', status: 'Active', phone: '', createdAt: dateKey() })
        authService.register(email, values.password || '')
        signIn(id, remember)
        toast.success('Welcome to your demo workspace')
      } else { const id = await authService.login(values.email.toLowerCase(), values.password || '', data.employees); signIn(id, remember); toast.success('Signed in successfully') }
      navigate((location.state as { from?: string } | null)?.from || '/dashboard', { replace: true })
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in. Please try again.') }
  }
  async function demoLogin(role: 'Admin' | 'Staff') { setLoadingDemo(true); setError(''); try { const id = await authService.login(role === 'Admin' ? 'admin@smartcrm.example' : 'staff@smartcrm.example', role === 'Admin' ? 'Admin123!' : 'Staff123!', data.employees); signIn(id); navigate('/dashboard'); toast.success(`Exploring as ${role}`) } catch (e) { setError(e instanceof Error ? e.message : 'Could not open demo') } finally { setLoadingDemo(false) } }
  return <div className="auth-page"><aside className="auth-story"><Link className="brand" to="/dashboard"><span className="brand-mark"><Layers2 size={24} /></span><span>Smart<span className="brand-light">CRM</span></span></Link><div className="auth-story-main"><span className="auth-eyebrow">SALES WORKSPACE</span><h2>A clear view of<br />your next opportunity.</h2><p>Keep customer accounts, deal progress, and team follow-ups connected in one workspace.</p><div className="auth-feature-list"><div><span>01</span><section><h3>Customer relationships</h3><p>Contacts, account history, and every follow-up.</p></section></div><div><span>02</span><section><h3>Pipeline management</h3><p>Six stages from first contact to a closed deal.</p></section></div><div><span>03</span><section><h3>Sales intelligence</h3><p>Revenue, conversion, and team performance.</p></section></div></div></div><div className="auth-story-footer"><span>SmartCRM · Sales management</span><span>{API_MODE ? 'Connected workspace' : 'Demo workspace'}</span></div></aside>
    <main className="auth-form-side"><div className="auth-top-link">{mode === 'login' ? <>New to SmartCRM?<Link to="/register">Create an account<ArrowUpIcon /></Link></> : <>Already have an account?<Link to="/login">Sign in<ArrowUpIcon /></Link></>}</div><div className="auth-form-container" key={mode}>{mode === 'forgot' && <Link className="back-link" to="/login"><ArrowLeft size={14} />Back to sign in</Link>}<span className="auth-form-icon">{mode === 'forgot' ? <LockKeyhole size={23} /> : <Layers2 size={24} />}</span><div className="auth-form-title"><h1>{mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create an account' : 'Reset your password'}</h1><p>{mode === 'login' ? 'Enter your credentials to access your workspace.' : mode === 'register' ? API_MODE ? 'New accounts are managed by your workspace administrator.' : 'Create a Staff account in this demo workspace.' : 'Check the password reset options for your account.'}</p></div><form onSubmit={handleSubmit(submit)} noValidate>{mode === 'register' && <div className="form-field"><label htmlFor="auth-name">Full name</label><input id="auth-name" autoComplete="name" placeholder="Ahmed Faraz" {...register('name')} />{errors.name && <span className="field-error">{errors.name.message}</span>}</div>}<div className="form-field"><label htmlFor="auth-email">Work email</label><input id="auth-email" type="email" autoComplete="email" placeholder="you@company.example" {...register('email')} />{errors.email && <span className="field-error">{errors.email.message}</span>}</div>{mode !== 'forgot' && <div className="form-field"><label htmlFor="auth-password">Password</label><div className="password-input"><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'} {...register('password')} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <span className="field-error">{errors.password.message}</span>}</div>}{mode !== 'forgot' && <div className="auth-form-options"><label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember me</label>{mode === 'login' && <Link to="/forgot-password">Forgot password?</Link>}</div>}{error && <div className="auth-error" role="alert">{error}</div>}{resetNotice && <div className="inline-notice" role="status"><LockKeyhole size={18} /><span>{API_MODE ? 'Password recovery email is not configured. Contact your workspace administrator. No email has been sent.' : 'Password reset needs a connected backend. No email has been sent. You can use a demo account to explore the workspace.'}</span></div>}<Button className="auth-submit" variant="primary" type="submit" disabled={isSubmitting || loadingDemo}>{isSubmitting ? <LoaderCircle size={17} className="spin" /> : null}{mode === 'login' ? 'Sign in to your workspace' : mode === 'register' ? API_MODE ? 'Create Staff account' : 'Create demo account' : 'Check reset availability'}<ArrowRight size={16} /></Button></form>{!API_MODE && mode !== 'forgot' && <><div className="auth-divider"><span>Try the demo workspace</span></div><div className="demo-login-buttons"><Button disabled={isSubmitting || loadingDemo} onClick={() => demoLogin('Admin')}><ShieldCheck size={16} />Explore as Admin</Button><Button disabled={isSubmitting || loadingDemo} onClick={() => demoLogin('Staff')}>Explore as Staff<ArrowRight size={15} /></Button></div></>}<div className="auth-demo-notice"><ShieldCheck size={16} /><p><b>{API_MODE ? 'Secure sign-in.' : 'Demo mode.'}</b> {API_MODE ? 'Your workspace uses the SmartCRM API. Credentials are verified by the server and records are stored in MongoDB.' : 'This is a frontend demo. Accounts, passwords, and data are stored locally for demonstration and do not provide production security.'}</p></div></div><div className="auth-form-footer"><span><LockKeyhole size={12} />{API_MODE ? 'SmartCRM workspace' : 'Demo workspace · Local browser storage'}</span><Link to="/login">SmartCRM</Link></div></main></div>
}
function ArrowUpIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.7"><path d="m7 17 10-10M7 7h10v10" /></svg> }
