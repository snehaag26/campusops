import { useEffect, useState } from 'react';
import {
  Activity, Award, CalendarDays, ChartNoAxesCombined, ChevronDown, CircleHelp,
  ClipboardCheck, LayoutDashboard, LogOut, Menu, Search, Settings2, ShieldCheck,
  TicketCheck, Users, X
} from 'lucide-react';
import { api } from './api.js';
import {
  AttendancePage, CertificatesPage, DashboardPage, EventsPage,
  RegistrationsPage, SessionsPage, UsersPage
} from './pages.jsx';

const TOKEN_KEY = 'campusops.token';
const USER_KEY = 'campusops.user';

const pageInfo = {
  overview: ['Overview', 'Your campus events, at a glance.'],
  events: ['Events', 'Plan and manage campus events.'],
  registrations: ['Registrations', 'Manage attendance lists and participant passes.'],
  sessions: ['Sessions', 'Build event schedules and manage session capacity.'],
  attendance: ['Attendance', 'Check people in and review event attendance.'],
  certificates: ['Certificates', 'Review eligibility and download certificates.'],
  users: ['People', 'Manage CampusOps accounts and roles.']
};

function navigationFor(user) {
  const items = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'registrations', label: 'Registrations', icon: TicketCheck },
    { id: 'sessions', label: 'Sessions', icon: ChartNoAxesCombined }
  ];
  if (['admin', 'organizer', 'volunteer'].includes(user.role)) {
    items.push({ id: 'attendance', label: 'Attendance', icon: ClipboardCheck });
  }
  if (['admin', 'organizer', 'participant'].includes(user.role)) {
    items.push({ id: 'certificates', label: 'Certificates', icon: Award });
  }
  if (user.role === 'admin') items.push({ id: 'users', label: 'People', icon: Users });
  return items;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  });
  const [ready, setReady] = useState(!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!token) return;
    api('/auth/me', token)
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, [token]);

  function signIn(session) {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
    setReady(true);
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  if (!ready) return <div className="boot-screen"><div className="brand-mark"><Activity size={22} /></div><span>Opening CampusOps…</span></div>;
  if (!token || !user) return <AuthPage onAuthenticated={signIn} />;
  return <Workspace user={user} token={token} onSignOut={signOut} />;
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [demoRole, setDemoRole] = useState('organizer');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await api('/auth/register', null, { method: 'POST', body: form });
      }
      const session = await api('/auth/login', null, {
        method: 'POST',
        body: { email: form.email, password: form.password }
      });
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="auth-story-top">
          <div className="brand-lockup light-lockup"><span className="brand-mark"><Activity size={20} strokeWidth={2.6} /></span><span>Campus<span className="brand-light">Ops</span></span></div>
          <div className="edition-pill"><span className="live-dot" /> CAMPUS OPERATIONS</div>
        </div>
        <div className="auth-story-copy">
          <p className="eyebrow light-eyebrow">MAKE EVERY GATHERING COUNT</p>
          <h1>More time for<br />the moments <em>that matter.</em></h1>
          <p className="auth-intro">One calm place to plan events, welcome your community, and see every detail come together.</p>
        </div>
        <div className="story-visual" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="visual-sun"><CalendarDays size={29} /></div>
          <div className="visual-card visual-card-a"><span className="visual-icon"><Users size={16} /></span><span><b>People first</b><small>One community, together</small></span></div>
          <div className="visual-card visual-card-b"><span className="mini-bars"><i /><i /><i /><i /><i /></span><span><b>Everything in sync</b><small>From sign-up to check-in</small></span></div>
          <div className="visual-spark spark-a">✳</div><div className="visual-spark spark-b">✦</div>
        </div>
        <div className="auth-story-foot"><span>BUILT FOR CAMPUS LIFE</span><span>© CAMPUSOPS</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand"><div className="brand-lockup"><span className="brand-mark"><Activity size={20} /></span><span>CampusOps</span></div></div>
          <div className="auth-heading">
            <span className="auth-step">{mode === 'login' ? 'WELCOME BACK' : 'JOIN YOUR CAMPUS'}</span>
            <h2>{mode === 'login' ? 'Sign in to your space' : 'Create your account'}</h2>
            <p>{mode === 'login' ? 'Your next great event starts here.' : 'Get started as a CampusOps participant.'}</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label className="field"><span>Full name</span><input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aditi Shah" required /></label>}
            <label className="field"><span>Email address</span><input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@campus.edu" required /></label>
            <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" minLength={mode === 'register' ? 8 : undefined} required /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-dark auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">→</span></button>
          </form>
          <div className="auth-switch">{mode === 'login' ? 'New to CampusOps?' : 'Already have an account?'} <button onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}> {mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
          <div className="demo-entry"><div className="demo-separator"><span>OR PREVIEW THE WORKSPACE</span></div><label className="field"><span>Preview as</span><select value={demoRole} onChange={(event) => setDemoRole(event.target.value)}><option value="admin">Admin</option><option value="organizer">Organizer</option><option value="participant">Participant</option><option value="volunteer">Volunteer</option></select></label><button className="button button-soft demo-button" type="button" onClick={() => { const users = { admin: [1, 'Alex Morgan'], organizer: [2, 'Taylor Brooks'], participant: [3, 'Maya Patel'], volunteer: [8, 'Jordan Lee'] }; onAuthenticated({ token: `demo:${demoRole}`, user: { id: users[demoRole][0], name: users[demoRole][1], email: `${demoRole}@campus.edu`, role: demoRole } }); }}>Open interactive demo <span aria-hidden="true">→</span></button><p>Sample content stays in this browser and never reaches your server.</p></div>
          <div className="auth-help"><ShieldCheck size={16} /><span>Your account is protected by secure sign-in.</span><button aria-label="Security information" title="CampusOps uses your backend account and role permissions"><CircleHelp size={15} /></button></div>
        </div>
      </section>
    </main>
  );
}

function Workspace({ user, token, onSignOut }) {
  const [activePage, setActivePage] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toast, setToast] = useState(null);
  const nav = navigationFor(user);
  const [pageTitle, pageSubtitle] = pageInfo[activePage] || pageInfo.overview;
  const avatar = (user.name || user.email || 'C').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  function notify(message, kind = 'success') {
    setToast({ message, kind });
    window.clearTimeout(window.__campusToastTimer);
    window.__campusToastTimer = window.setTimeout(() => setToast(null), 3200);
  }

  function navigate(page) {
    setActivePage(page);
    setMobileOpen(false);
    setGlobalSearch('');
  }

  return (
    <div className="workspace">
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-lockup"><span className="brand-mark"><Activity size={19} strokeWidth={2.6} /></span><span>Campus<span className="brand-light">Ops</span></span></div><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activePage === id ? 'nav-active' : ''}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{id === 'events' && <span className="nav-arrow">›</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={18} /></div><div><b>Need a hand?</b><span>Find your way around</span></div><ChevronDown size={15} /></div>
          <div className="sidebar-user"><div className="avatar avatar-small">{avatar}</div><div className="sidebar-user-info"><b>{user.name}</b><span>{user.role}</span></div><button className="icon-button signout-button" aria-label="Sign out" title="Sign out" onClick={onSignOut}><LogOut size={17} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>CampusOps</span><b>/</b><strong>{pageTitle}</strong></div></div>
          <div className="topbar-right">
            <div className={`global-search ${searchOpen ? 'search-expanded' : ''}`}><Search size={17} /><input aria-label="Search events" placeholder="Search events…" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} onFocus={() => { setSearchOpen(true); if (activePage !== 'events') setActivePage('events'); }} /><button className="search-close" onClick={() => { setSearchOpen(false); setGlobalSearch(''); }} aria-label="Clear search"><X size={14} /></button></div>
            <div className="topbar-divider" />
            <div className={`api-status ${String(token).startsWith('demo:') ? 'demo-status' : ''}`}><span className="api-pulse" /><span>{String(token).startsWith('demo:') ? 'Demo data · this browser' : 'API workspace'}</span></div>
            <button className="icon-button topbar-settings" title="Workspace settings" aria-label="Workspace settings"><Settings2 size={18} /></button>
            <button className="avatar top-avatar" title={`${user.name} · ${user.role}`} onClick={() => onSignOut()}>{avatar}</button>
          </div>
        </header>

        <div className="content-wrap">
          <div className="content-heading"><div><p className="eyebrow">CAMPUS OPERATIONS</p><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>{activePage === 'overview' && <div className="today-chip"><CalendarDays size={16} />{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</div>}</div>
          {activePage === 'overview' && <DashboardPage token={token} user={user} onNavigate={navigate} notify={notify} />}
          {activePage === 'events' && <EventsPage token={token} user={user} initialSearch={globalSearch} notify={notify} />}
          {activePage === 'registrations' && <RegistrationsPage token={token} user={user} notify={notify} />}
          {activePage === 'sessions' && <SessionsPage token={token} user={user} notify={notify} />}
          {activePage === 'attendance' && <AttendancePage token={token} user={user} notify={notify} />}
          {activePage === 'certificates' && <CertificatesPage token={token} user={user} notify={notify} />}
          {activePage === 'users' && user.role === 'admin' && <UsersPage token={token} notify={notify} />}
        </div>
        <footer className="app-footer"><span>CampusOps</span><span>Made for the moments that bring campus together.</span><span className="footer-version"><span className="api-pulse" /> {String(token).startsWith('demo:') ? 'DEMO · SAVED LOCALLY' : 'API CONNECTED'}</span></footer>
      </main>
      {toast && <div className={`toast toast-${toast.kind}`} role="status"><span className="toast-check">{toast.kind === 'error' ? '!' : '✓'}</span>{toast.message}</div>}
    </div>
  );
}

