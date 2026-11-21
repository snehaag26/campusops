import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Award, CalendarDays, ChartNoAxesCombined, Check,
  ChevronLeft, ChevronRight, CircleAlert, Clock3, Download, MapPin,
  Plus, RefreshCw, Search, ShieldCheck, TicketCheck, Users, X
} from 'lucide-react';
import { api, download } from './api.js';

const managerRoles = ['admin', 'organizer'];
const statusLabel = { registered: 'Registered', cancelled: 'Cancelled', checked_in: 'Checked in' };

function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be confirmed' : new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function dateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace(' ', 'T');
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function EmptyState({ icon: Icon = CalendarDays, title, description, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={23} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

function LoadingLine() { return <div className="loading-line"><span /><span /><span /></div>; }

function InlineError({ error, retry }) {
  if (!error) return null;
  return <div className="inline-error"><CircleAlert size={17} /><span>{error}</span>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>;
}

function StatCard({ label, value, hint, icon: Icon, tone = 'mint', trend }) {
  return <article className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={19} /></div><span className="stat-label">{label}</span><strong>{value}</strong><div className="stat-foot"><span>{hint}</span>{trend && <span className="stat-trend"><ArrowUpRight size={14} />{trend}</span>}</div></article>;
}

export function DashboardPage({ token, user, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError('');
    try { setData(await api('/events?page=1&limit=50', token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);

  const events = data?.events || [];
  const activeEvents = events.filter((event) => new Date(event.end_at) >= new Date());
  const registrations = events.reduce((sum, event) => sum + Number(event.registered_count || 0), 0);
  const remainingSeats = events.reduce((sum, event) => sum + Math.max(0, Number(event.capacity) - Number(event.registered_count || 0)), 0);
  const nextEvents = [...events].filter((event) => new Date(event.start_at) >= new Date()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)).slice(0, 4);
  const fill = events.reduce((sum, event) => sum + Number(event.registered_count || 0), 0) /
    Math.max(1, events.reduce((sum, event) => sum + Number(event.capacity || 0), 0));

  return <div className="page-stack">
    <section className="welcome-banner">
      <div className="welcome-copy"><div className="welcome-tag"><span /> YOUR CAMPUS, IN MOTION</div><h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name?.split(' ')[0] || 'there'}.</h2><p>Everything you need to make campus life happen, all in one place.</p><button className="button button-white" onClick={() => onNavigate('events')}>Explore events <ArrowRight size={16} /></button></div>
      <div className="welcome-art" aria-hidden="true"><div className="welcome-ring ring-one" /><div className="welcome-ring ring-two" /><div className="welcome-orb"><CalendarDays size={34} /></div><div className="art-star art-star-one">✦</div><div className="art-star art-star-two">✳</div><div className="art-dot dot-one" /><div className="art-dot dot-two" /></div>
    </section>
    <InlineError error={error} retry={load} />
    <section className="stats-grid">
      <StatCard label="Live events" value={loading ? '—' : activeEvents.length} hint="Upcoming or in progress" icon={CalendarDays} tone="mint" trend={events.length ? `${events.length} total` : null} />
      <StatCard label="Registrations" value={loading ? '—' : registrations.toLocaleString()} hint="Across all your events" icon={TicketCheck} tone="lavender" />
      <StatCard label="Seats available" value={loading ? '—' : remainingSeats.toLocaleString()} hint="Space for your community" icon={Users} tone="peach" />
      <StatCard label="Capacity filled" value={loading ? '—' : `${Math.round(fill * 100)}%`} hint="Current registration rate" icon={ArrowUpRight} tone="sky" />
    </section>
    <section className="dashboard-grid">
      <div className="panel upcoming-panel">
        <div className="panel-heading"><div><span className="section-kicker">COMING UP</span><h2>What’s next</h2></div><button className="text-button" onClick={() => onNavigate('events')}>All events <ArrowRight size={15} /></button></div>
        {loading ? <LoadingLine /> : nextEvents.length ? <div className="upcoming-list">{nextEvents.map((event, index) => <div className="upcoming-row" key={event.id}><div className={`date-tile date-tile-${index % 4}`}><b>{new Date(event.start_at).getDate()}</b><span>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(event.start_at)).toUpperCase()}</span></div><div className="upcoming-info"><b>{event.title}</b><span><Clock3 size={13} />{formatDate(event.start_at, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span><span><MapPin size={13} />{event.venue}</span></div><div className="upcoming-count"><b>{Number(event.registered_count || 0)}</b><span>going</span></div></div>)}</div> : <EmptyState title="Your calendar is open" description="Create or explore an event to get things moving." action={managerRoles.includes(user.role) && <button className="text-button" onClick={() => onNavigate('events')}>Create an event <ArrowRight size={14} /></button>} />}
      </div>
      <div className="panel pulse-panel">
        <div className="panel-heading"><div><span className="section-kicker">AT A GLANCE</span><h2>Campus pulse</h2></div><div className="pulse-dot"><span /></div></div>
        <div className="pulse-chart"><div className="chart-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div><div className="chart-area"><div className="chart-gridline line-one" /><div className="chart-gridline line-two" /><div className="chart-gridline line-three" /><div className="chart-bars">{(events.slice(0, 7).length ? events.slice(0, 7) : Array.from({ length: 7 }, (_, i) => ({ id: i, registered_count: 0, capacity: 1 }))).map((event, i) => <div className="chart-bar-group" key={event.id}><div className={`chart-bar bar-${i % 4}`} style={{ height: `${Math.max(6, Math.min(100, Number(event.registered_count || 0) / Math.max(1, Number(event.capacity || 1)) * 100))}%` }} /><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span></div>)}</div></div></div>
        <div className="pulse-summary"><div><span className="pulse-legend" />Registration capacity</div><b>{loading ? '—' : `${Math.round(fill * 100)}%`}<small>filled</small></b></div>
        <div className="pulse-note"><span className="note-icon"><Activity size={15} /></span><span>{loading ? 'Loading your latest activity…' : events.length ? `${events.length} events are part of your campus story.` : 'Your event data will appear here once your API is connected.'}</span></div>
      </div>
    </section>
    <section className="quick-actions"><div><span className="section-kicker">QUICK ACTIONS</span><h2>Make your next move</h2></div><div className="quick-action-list"><button onClick={() => onNavigate('events')}><span className="quick-icon quick-icon-mint"><Plus size={18} /></span><span><b>{managerRoles.includes(user.role) ? 'Create an event' : 'Browse events'}</b><small>{managerRoles.includes(user.role) ? 'Start planning something special' : 'Find your next campus moment'}</small></span><ArrowRight size={16} /></button><button onClick={() => onNavigate('registrations')}><span className="quick-icon quick-icon-lilac"><TicketCheck size={18} /></span><span><b>{user.role === 'participant' ? 'My registrations' : 'Registration lists'}</b><small>{user.role === 'participant' ? 'Your passes and event details' : 'See who’s joining your events'}</small></span><ArrowRight size={16} /></button><button onClick={() => onNavigate('sessions')}><span className="quick-icon quick-icon-peach"><ChartNoAxesCombined size={18} /></span><span><b>Explore sessions</b><small>Build a schedule worth showing up for</small></span><ArrowRight size={16} /></button></div></section>
  </div>;
}

export function EventsPage({ token, user, initialSearch = '', notify }) {
  const [query, setQuery] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ events: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const limit = 8;
  const canCreate = managerRoles.includes(user.role);
  const canRegister = user.role === 'participant';

  useEffect(() => { setQuery(initialSearch); setSearch(initialSearch); setPage(1); }, [initialSearch]);

  async function load() {
    setLoading(true); setError('');
    try { setData(await api(`/events?q=${encodeURIComponent(search)}&page=${page}&limit=${limit}`, token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token, search, page]);

  async function saveEvent(values) {
    try {
      await api(editing ? `/events/${editing.id}` : '/events', token, { method: editing ? 'PUT' : 'POST', body: values });
      setShowForm(false); setEditing(null); notify(editing ? 'Event updated' : 'Event created'); load();
    } catch (requestError) { notify(requestError.message, 'error'); }
  }

  async function removeEvent(event) {
    if (!window.confirm(`Delete “${event.title}”? Events with registrations can’t be deleted.`)) return;
    try { await api(`/events/${event.id}`, token, { method: 'DELETE' }); notify('Event deleted'); load(); }
    catch (requestError) { notify(requestError.message, 'error'); }
  }

  async function registerForEvent(event) {
    try { await api('/registrations', token, { method: 'POST', body: { eventId: event.id } }); notify(`You’re registered for ${event.title}`); load(); }
    catch (requestError) { notify(requestError.message, 'error'); }
  }

  function owns(event) { return user.role === 'admin' || Number(event.created_by) === Number(user.id); }

  return <div className="page-stack">
    <section className="toolbar-panel"><form className="search-form" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}><div className="search-input-wrap"><Search size={17} /><input placeholder="Search by event or venue" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>↵</kbd></div><button className="button button-soft">Search</button></form><div className="toolbar-actions"><span className="result-count">{data.total || 0} events</span>{canCreate && <button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> New event</button>}</div></section>
    <InlineError error={error} retry={load} />
    {loading ? <div className="panel"><LoadingLine /></div> : data.events.length ? <section className="event-grid">{data.events.map((event, index) => <article className="event-card" key={event.id}><div className={`event-card-art event-art-${index % 4}`}><div className="event-art-date"><b>{new Date(event.start_at).getDate()}</b><span>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(event.start_at))}</span></div><div className="event-art-orbit" /><CalendarDays size={22} className="event-art-glyph" /></div><div className="event-card-body"><div className="event-card-top"><span className={`status-pill ${new Date(event.end_at) < new Date() ? 'status-muted' : 'status-live'}`}><i />{new Date(event.end_at) < new Date() ? 'Completed' : 'Upcoming'}</span><span className="event-id">#{event.id}</span></div><h3>{event.title}</h3><p className="event-description">{event.description || 'A campus gathering, ready to take shape.'}</p><div className="event-meta"><span><MapPin size={14} />{event.venue}</span><span><Clock3 size={14} />{formatTime(event.start_at)} – {formatTime(event.end_at)}</span></div><div className="event-capacity"><div><span>Registrations</span><b>{event.registered_count || 0}<small> / {event.capacity}</small></b></div><div className="progress-track"><span style={{ width: `${Math.min(100, Number(event.registered_count || 0) / Math.max(1, Number(event.capacity)) * 100)}%` }} /></div></div>{canCreate && owns(event) && <div className="event-card-actions"><button className="text-button" onClick={() => { setEditing(event); setShowForm(true); }}>Edit details</button><button className="danger-text" onClick={() => removeEvent(event)}>Delete</button></div>}{canRegister && <div className="event-card-actions"><button className="button button-soft" onClick={() => registerForEvent(event)} disabled={new Date(event.end_at) < new Date()}>Register for event <ArrowRight size={15} /></button></div>}</div></article>)}</section> : <div className="panel"><EmptyState icon={CalendarDays} title={search ? 'No events match that search' : 'No events here yet'} description={search ? 'Try a different event name or venue.' : canCreate ? 'Start with one gathering and build the momentum from there.' : 'Check back soon for new campus events.'} action={canCreate && !search && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create first event</button>} /></div>}
    {data.total > limit && <div className="pagination"><span>Showing {Math.min((page - 1) * limit + 1, data.total)}–{Math.min(page * limit, data.total)} of {data.total}</span><div><button className="icon-button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button><b>Page {page}</b><button className="icon-button" disabled={page * limit >= data.total} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button></div></div>}
    {showForm && <EventDialog event={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={saveEvent} />}
  </div>;
}

function EventDialog({ event, onClose, onSave }) {
  const [form, setForm] = useState({
    title: event?.title || '', description: event?.description || '', venue: event?.venue || '',
    startAt: dateTimeInput(event?.start_at), endAt: dateTimeInput(event?.end_at), capacity: event?.capacity || 40
  });
  const [busy, setBusy] = useState(false);
  function update(key, value) { setForm({ ...form, [key]: value }); }
  async function submit(event) { event.preventDefault(); setBusy(true); await onSave({ ...form, capacity: Number(form.capacity), description: form.description || null }); setBusy(false); }
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="event-modal-title"><div className="modal-heading"><div><span className="section-kicker">EVENT DETAILS</span><h2 id="event-modal-title">{event ? 'Shape the details' : 'Create an event'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><form className="modal-form" onSubmit={submit}><label className="field"><span>Event name</span><input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Campus Tech Day" required maxLength={200} /></label><label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => update('venue', e.target.value)} placeholder="Main Auditorium" required maxLength={255} /></label><label className="field"><span>Description <small>Optional</small></span><textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows="3" placeholder="What should people know?" /></label><div className="form-row"><label className="field"><span>Starts</span><input type="datetime-local" value={form.startAt} onChange={(e) => update('startAt', e.target.value)} required /></label><label className="field"><span>Ends</span><input type="datetime-local" value={form.endAt} onChange={(e) => update('endAt', e.target.value)} required /></label></div><label className="field"><span>Capacity</span><input type="number" min="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : event ? 'Save changes' : 'Create event'}<ArrowRight size={16} /></button></div></form></section></div>;
}

export function RegistrationsPage({ token, user, notify }) {
  if (user.role === 'participant') return <MyRegistrations token={token} notify={notify} />;
  if (!managerRoles.includes(user.role)) return <div className="panel"><EmptyState icon={TicketCheck} title="Registration lists are private" description="Ask an event organizer to share attendee details with you." /></div>;
  return <ManagedRegistrations token={token} notify={notify} />;
}

function MyRegistrations({ token, notify }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    try { setRows(await api('/registrations/me', token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);
  async function cancel(row) {
    if (!window.confirm(`Cancel your registration for “${row.eventTitle}”?`)) return;
    try { await api(`/registrations/${row.id}`, token, { method: 'DELETE' }); notify('Registration cancelled'); load(); }
    catch (requestError) { notify(requestError.message, 'error'); }
  }
  return <div className="page-stack"><div className="toolbar-panel registration-toolbar"><div><span className="section-kicker">YOUR EVENT PASSES</span><h2>Every ticket, in one place</h2></div><button className="button button-soft" onClick={load}><RefreshCw size={16} /> Refresh</button></div><InlineError error={error} retry={load} />{loading ? <div className="panel"><LoadingLine /></div> : rows.length ? <section className="registration-grid">{rows.map((row) => <article className={`ticket-card ${row.status === 'cancelled' ? 'ticket-cancelled' : ''}`} key={row.id}><div className="ticket-main"><div className="ticket-date"><b>{new Date(row.eventStartAt).getDate()}</b><span>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(row.eventStartAt)).toUpperCase()}</span></div><div className="ticket-info"><span className={`status-pill ${row.status === 'cancelled' ? 'status-muted' : 'status-live'}`}><i />{statusLabel[row.status] || row.status}</span><h3>{row.eventTitle}</h3><p><MapPin size={14} />{row.venue}</p><p><Clock3 size={14} />{formatDate(row.eventStartAt, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p></div></div><div className="ticket-divider"><span /><span /></div><div className="ticket-qr">{row.status === 'cancelled' ? <div className="qr-cancelled">Ticket cancelled</div> : <><img src={row.qrCode} alt={`Check-in QR code for ${row.eventTitle}`} /><span>SCAN TO CHECK IN</span></>}{row.status !== 'cancelled' && <button className="danger-text" onClick={() => cancel(row)}>Cancel registration</button>}</div></article>)}</section> : <div className="panel"><EmptyState icon={TicketCheck} title="No registrations yet" description="When you sign up for an event, your pass and QR code will show up here." /></div>}</div>;
}

function ManagedRegistrations({ token, notify }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [data, setData] = useState({ registrations: [], total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    api('/events?page=1&limit=50', token).then((result) => {
      setEvents(result.events || []);
      if (result.events?.length) setEventId(String(result.events[0].id));
    }).catch((requestError) => setError(requestError.message)).finally(() => setEventsLoading(false));
  }, [token]);

  async function load() {
    if (!eventId) return;
    setLoading(true); setError('');
    try { setData(await api(`/registrations/event/${eventId}?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`, token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token, eventId, search, status, page]);

  async function cancel(row) {
    if (!window.confirm(`Cancel ${row.name}’s registration?`)) return;
    try { await api(`/registrations/${row.id}`, token, { method: 'DELETE' }); notify('Registration cancelled'); load(); }
    catch (requestError) { notify(requestError.message, 'error'); }
  }

  return <div className="page-stack"><section className="toolbar-panel registrations-filters"><label className="select-field"><span>Event</span><select value={eventId} onChange={(e) => { setEventId(e.target.value); setPage(1); }} disabled={eventsLoading || !events.length}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><form className="search-form" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}><div className="search-input-wrap"><Search size={17} /><input placeholder="Search a name or email" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div><button className="button button-soft">Search</button></form><label className="select-field status-select"><span>Status</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="registered">Registered</option><option value="cancelled">Cancelled</option><option value="checked_in">Checked in</option></select></label></section><InlineError error={error} retry={load} />{loading ? <div className="panel"><LoadingLine /></div> : data.registrations.length ? <div className="panel table-panel"><div className="panel-heading"><div><span className="section-kicker">ATTENDEE LIST</span><h2>{data.total} registrations</h2></div></div><div className="table-scroll"><table><thead><tr><th>Participant</th><th>Email</th><th>Registered</th><th>Status</th><th /></tr></thead><tbody>{data.registrations.map((row) => <tr key={row.id}><td><div className="person-cell"><span className="avatar avatar-table">{row.name?.slice(0, 1).toUpperCase()}</span><b>{row.name}</b></div></td><td>{row.email}</td><td>{formatDate(row.registeredAt)}</td><td><span className={`status-pill ${row.status === 'cancelled' ? 'status-muted' : row.status === 'checked_in' ? 'status-checked' : 'status-live'}`}><i />{statusLabel[row.status] || row.status}</span></td><td>{row.status !== 'cancelled' && <button className="danger-text" onClick={() => cancel(row)}>Cancel</button>}</td></tr>)}</tbody></table></div><div className="table-footer"><span>{data.total} total</span><Pager page={page} limit={limit} total={data.total} onChange={setPage} /></div></div> : <div className="panel"><EmptyState icon={Users} title={eventId ? 'No registrations found' : 'Choose an event'} description={eventId ? 'Try changing your search or status filter.' : 'Create an event before managing its registration list.'} /></div>}</div>;
}

function Pager({ page, limit, total, onChange }) {
  if (total <= limit) return null;
  return <div className="pager"><span>Page {page} of {Math.ceil(total / limit)}</span><button className="icon-button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><button className="icon-button" disabled={page * limit >= total} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div>;
}

export function SessionsPage({ token, user, notify }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/events?page=1&limit=50', token).then((result) => {
      setEvents(result.events || []);
      if (result.events?.length) setEventId(String(result.events[0].id));
    }).catch((requestError) => setError(requestError.message));
    if (user.role === 'participant') api('/registrations/me', token).then(setMyRegistrations).catch(() => {});
  }, [token, user.role]);

  async function load() {
    if (!eventId) { setLoading(false); return; }
    setLoading(true); setError('');
    try { setSessions(await api(`/sessions/event/${eventId}`, token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [eventId, token]);

  const registration = myRegistrations.find((row) => Number(row.eventId) === Number(eventId) && row.status !== 'cancelled');
  async function joinSession(session) {
    if (!registration) { notify('Register for this event before joining a session.', 'error'); return; }
    setBusyId(session.id);
    try { await api(`/sessions/${session.id}/register`, token, { method: 'POST', body: { registrationId: registration.id } }); notify('You’re on the session list'); load(); }
    catch (requestError) { notify(requestError.message, 'error'); }
    finally { setBusyId(null); }
  }

  async function createSession(values) {
    setSubmitting(true);
    try {
      await api('/sessions', token, { method: 'POST', body: { ...values, eventId: Number(eventId), capacity: Number(values.capacity) } });
      notify('Session added to the schedule'); setShowForm(false); load();
    } catch (requestError) { notify(requestError.message, 'error'); }
    finally { setSubmitting(false); }
  }

  return <div className="page-stack"><section className="toolbar-panel session-toolbar"><label className="select-field"><span>Choose an event</span><select value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={!events.length}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>{managerRoles.includes(user.role) && eventId && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Add session</button>}</section><InlineError error={error} retry={load} />{loading ? <div className="panel"><LoadingLine /></div> : sessions.length ? <section className="session-list">{sessions.map((session, index) => { const percent = Math.min(100, Number(session.registered_count || 0) / Math.max(1, Number(session.capacity)) * 100); return <article className="session-card" key={session.id}><div className={`session-time session-time-${index % 4}`}><b>{formatTime(session.start_at)}</b><span>{formatTime(session.end_at)}</span></div><div className="session-main"><span className="section-kicker">SESSION {String(index + 1).padStart(2, '0')}</span><h3>{session.title}</h3><p>{session.speaker || 'Speaker to be announced'}</p><div className="session-capacity"><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><span>{session.registered_count || 0} / {session.capacity} seats</span></div></div><div className="session-action">{user.role === 'participant' ? <button className="button button-soft" disabled={busyId === session.id || Number(session.registered_count) >= Number(session.capacity)} onClick={() => joinSession(session)}>{busyId === session.id ? 'Joining…' : 'Join session'}<ArrowRight size={15} /></button> : <span className="session-duration"><Clock3 size={15} />{Math.max(15, Math.round((new Date(session.end_at) - new Date(session.start_at)) / 60000))} min</span>}</div></article>; })}</section> : <div className="panel"><EmptyState icon={ChartNoAxesCombined} title="The schedule is still taking shape" description={eventId ? 'There are no sessions for this event yet.' : 'Create an event to start building its session schedule.'} action={managerRoles.includes(user.role) && eventId && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add first session</button>} /></div>}{showForm && <SessionDialog event={events.find((item) => String(item.id) === eventId)} onClose={() => setShowForm(false)} onSave={createSession} busy={submitting} />}</div>;
}

function SessionDialog({ event, onClose, onSave, busy }) {
  const [form, setForm] = useState({ title: '', speaker: '', startAt: '', endAt: '', capacity: 25 });
  function update(key, value) { setForm({ ...form, [key]: value }); }
  return <div className="modal-scrim"><section className="modal-card" role="dialog" aria-modal="true"><div className="modal-heading"><div><span className="section-kicker">{event?.title || 'EVENT'}</span><h2>Add a session</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><label className="field"><span>Session title</span><input value={form.title} onChange={(e) => update('title', e.target.value)} required /></label><label className="field"><span>Speaker <small>Optional</small></span><input value={form.speaker} onChange={(e) => update('speaker', e.target.value)} /></label><div className="form-row"><label className="field"><span>Starts</span><input type="datetime-local" value={form.startAt} onChange={(e) => update('startAt', e.target.value)} required /></label><label className="field"><span>Ends</span><input type="datetime-local" value={form.endAt} onChange={(e) => update('endAt', e.target.value)} required /></label></div><label className="field"><span>Seats</span><input type="number" min="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} required /></label><div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Add to schedule'}</button></div></form></section></div>;
}

export function AttendancePage({ token, user, notify }) {
  if (user.role === 'volunteer') return <CheckInPage token={token} notify={notify} />;
  if (!managerRoles.includes(user.role)) return <div className="panel"><EmptyState icon={ClipboardCheck} title="Attendance tools are for event teams" description="Your event organizer can help with check-in and attendance details." /></div>;
  return <AttendanceOverview token={token} notify={notify} />;
}

function CheckInPage({ token, notify }) {
  const [form, setForm] = useState({ qrToken: '', sessionId: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try { setResult(await api('/attendance/check-in', token, { method: 'POST', body: form })); notify('Participant checked in'); setForm({ qrToken: '', sessionId: '' }); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  return <div className="checkin-layout"><section className="checkin-intro"><span className="checkin-mark"><TicketCheck size={23} /></span><span className="section-kicker">VOLUNTEER CHECK-IN</span><h2>Welcome them in.</h2><p>Scan the participant’s event QR code, then enter the session they’re arriving for.</p><div className="checkin-steps"><div><b>01</b><span>Scan the QR token</span></div><div><b>02</b><span>Enter the session ID</span></div><div><b>03</b><span>Confirm check-in</span></div></div></section><section className="panel checkin-form-panel"><div className="panel-heading"><div><span className="section-kicker">QUICK CHECK-IN</span><h2>Participant details</h2></div><div className="checkin-online"><span /> READY</div></div><form className="modal-form" onSubmit={submit}><label className="field"><span>QR token</span><input autoFocus value={form.qrToken} onChange={(e) => setForm({ ...form, qrToken: e.target.value })} placeholder="Paste or scan the registration token" required /></label><label className="field"><span>Session ID</span><input type="number" min="1" value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} placeholder="e.g. 12" required /></label>{error && <InlineError error={error} />}{result && <div className="checkin-result"><span><Check size={18} /></span><div><b>{result.participantName} is checked in</b><small>{result.sessionTitle} · {formatTime(result.checkedInAt)}</small></div></div>}<button className="button button-primary checkin-submit" disabled={busy}>{busy ? 'Checking in…' : 'Confirm check-in'}<ArrowRight size={16} /></button></form></section></div>;
}

function AttendanceOverview({ token, notify }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [summary, setSummary] = useState(null);
  const [noShows, setNoShows] = useState([]);
  const [attendees, setAttendees] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api('/events?page=1&limit=50', token).then((result) => { setEvents(result.events || []); if (result.events?.length) setEventId(String(result.events[0].id)); }).catch((requestError) => setError(requestError.message)); }, [token]);
  async function load() {
    if (!eventId) return;
    setLoading(true); setError(''); setAttendees(null);
    try { const [stats, misses] = await Promise.all([api(`/attendance/event/${eventId}/summary`, token), api(`/attendance/event/${eventId}/no-shows`, token)]); setSummary(stats); setNoShows(misses); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token, eventId]);
  async function showAttendees(session) {
    try { setAttendees({ session, rows: await api(`/attendance/session/${session.session_id}`, token) }); }
    catch (requestError) { notify(requestError.message, 'error'); }
  }
  return <div className="page-stack"><section className="toolbar-panel session-toolbar"><label className="select-field"><span>Event attendance</span><select value={eventId} onChange={(e) => setEventId(e.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><button className="button button-soft" onClick={load}><RefreshCw size={16} /> Refresh</button></section><InlineError error={error} retry={load} />{loading ? <div className="panel"><LoadingLine /></div> : summary && <><section className="stats-grid attendance-stats"><StatCard label="Checked in" value={Number(summary.eventTotal || 0)} hint="Across all sessions" icon={Check} tone="mint" /><StatCard label="Sessions" value={summary.sessions?.length || 0} hint="On this event schedule" icon={ChartNoAxesCombined} tone="lavender" /><StatCard label="No-shows" value={noShows.length} hint="Registered, not checked in" icon={Users} tone="peach" /><StatCard label="Check-in coverage" value={`${Math.round(Number(summary.eventTotal || 0) / Math.max(1, Number(summary.eventTotal || 0) + noShows.length) * 100)}%`} hint="Of registered participants" icon={ArrowUpRight} tone="sky" /></section><div className="dashboard-grid attendance-grid"><section className="panel"><div className="panel-heading"><div><span className="section-kicker">SESSION CHECK-INS</span><h2>Attendance by session</h2></div></div>{summary.sessions?.length ? <div className="attendance-session-list">{summary.sessions.map((session) => <div className="attendance-session" key={session.session_id}><div><b>{session.title}</b><span>{formatDate(session.start_at, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div><strong>{session.attended_count}<small> checked in</small></strong><button className="text-button" onClick={() => showAttendees(session)}>View list <ArrowRight size={14} /></button></div>)}</div> : <EmptyState icon={ChartNoAxesCombined} title="No sessions yet" description="Attendance will appear here when sessions are added." />}</section><section className="panel no-show-panel"><div className="panel-heading"><div><span className="section-kicker">FOLLOW UP</span><h2>No-show list</h2></div><span className="count-badge">{noShows.length}</span></div>{noShows.length ? <div className="no-show-list">{noShows.slice(0, 7).map((row) => <div className="no-show-row" key={row.registration_id}><span className="avatar avatar-table">{row.name?.slice(0, 1)}</span><div><b>{row.name}</b><span>{row.email}</span></div><ArrowDownRight size={15} /></div>)}</div> : <p className="muted-copy no-show-empty">Everyone who registered has checked in. Lovely work.</p>}</section></div></>}{attendees && <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setAttendees(null); }}><section className="modal-card attendee-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><span className="section-kicker">SESSION ATTENDANCE</span><h2>{attendees.session.title}</h2></div><button className="icon-button" onClick={() => setAttendees(null)} aria-label="Close"><X size={20} /></button></div>{attendees.rows.length ? <div className="attendee-list">{attendees.rows.map((row) => <div className="attendee-row" key={row.attendance_id}><span className="avatar avatar-table">{row.name?.slice(0, 1)}</span><div><b>{row.name}</b><span>{row.email}</span></div><span className="checked-time"><Check size={14} />{formatTime(row.checked_in_at)}</span></div>)}</div> : <EmptyState icon={Users} title="No check-ins yet" description="Checked-in participants will show up here." />}</section></div>}</div>;
}

export function CertificatesPage({ token, user, notify }) {
  if (user.role === 'participant') return <MyCertificates token={token} notify={notify} />;
  if (!managerRoles.includes(user.role)) return <div className="panel"><EmptyState icon={Award} title="Certificates aren’t available for this role" description="Ask an organizer or admin for help with certificate eligibility." /></div>;
  return <EvaluateCertificates token={token} notify={notify} />;
}

function MyCertificates({ token, notify }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(''); try { setRows(await api('/certificates/me', token)); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [token]);
  async function getPdf(row) { try { await download(`/certificates/${row.id}/download`, token, `campusops-certificate-${row.id}.pdf`); } catch (requestError) { notify(requestError.message, 'error'); } }
  return <div className="page-stack"><div className="toolbar-panel certificate-toolbar"><div><span className="section-kicker">YOUR RECOGNITION</span><h2>Milestones worth keeping</h2></div><button className="button button-soft" onClick={load}><RefreshCw size={16} /> Refresh</button></div><InlineError error={error} retry={load} />{loading ? <div className="panel"><LoadingLine /></div> : rows.length ? <div className="certificate-grid">{rows.map((row, i) => <article className={`certificate-card cert-card-${i % 3}`} key={row.id}><div className="certificate-flower">✳</div><span className="section-kicker">CAMPUSOPS RECOGNITION</span><h3>{row.event_title}</h3><p>{row.eligible ? 'You’re eligible for a certificate of participation.' : 'Keep showing up — eligibility is still being reviewed.'}</p><div className="certificate-meta"><span><CalendarDays size={14} />{formatDate(row.start_at)}</span><span className={`status-pill ${row.eligible ? 'status-live' : 'status-muted'}`}><i />{row.eligible ? 'Eligible' : 'In progress'}</span></div><button className="button button-dark" disabled={!row.eligible} onClick={() => getPdf(row)}><Download size={16} /> Download PDF</button></article>)}</div> : <div className="panel"><EmptyState icon={Award} title="Your story is still being written" description="Certificates for eligible events will appear here." /></div>}</div>;
}

function EvaluateCertificates({ token, notify }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [minPercent, setMinPercent] = useState(60);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/events?page=1&limit=50', token).then((payload) => { setEvents(payload.events || []); if (payload.events?.length) setEventId(String(payload.events[0].id)); }).catch((requestError) => setError(requestError.message)); }, [token]);
  async function evaluate(event) { event.preventDefault(); setBusy(true); setError(''); setResult(null); try { setResult(await api(`/certificates/event/${eventId}/evaluate`, token, { method: 'POST', body: { minPercent: Number(minPercent) } })); notify('Eligibility review complete'); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  return <div className="certificate-admin-grid"><section className="panel evaluate-panel"><div className="panel-heading"><div><span className="section-kicker">EVENT TEAM</span><h2>Evaluate eligibility</h2></div><div className="certificate-seal"><Award size={22} /></div></div><p className="muted-copy">Run the attendance policy for an event. Eligible participants can then download their certificate.</p><InlineError error={error} /><form className="modal-form" onSubmit={evaluate}><label className="field"><span>Event</span><select value={eventId} onChange={(e) => setEventId(e.target.value)} required>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><label className="field"><span>Minimum attendance</span><div className="percent-input"><input type="number" min="0" max="100" value={minPercent} onChange={(e) => setMinPercent(e.target.value)} required /><span>%</span></div></label><button className="button button-primary" disabled={busy || !eventId}>{busy ? 'Evaluating…' : 'Evaluate certificates'}<ArrowRight size={16} /></button></form>{result && <div className="evaluation-result"><div><b>{result.eligible}</b><span>eligible</span></div><div><b>{result.notEligible}</b><span>not eligible</span></div></div>}</section><aside className="panel certificate-rule"><div className="rule-icon"><ShieldCheck size={20} /></div><span className="section-kicker">THE RULE</span><h3>Clear, consistent criteria.</h3><p>The backend checks each participant’s attendance against the percentage you set. You can run the review again if the policy changes.</p><div className="rule-percent"><span>Current threshold</span><b>{minPercent}%</b></div></aside></div>;
}

export function UsersPage({ token, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  async function load() { setLoading(true); setError(''); try { setUsers(await api('/users', token)); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [token]);
  async function createUser(form) { try { await api('/users', token, { method: 'POST', body: form }); notify('Account created'); setShowForm(false); load(); } catch (requestError) { notify(requestError.message, 'error'); } }
  const counts = useMemo(() => users.reduce((acc, user) => ({ ...acc, [user.role]: (acc[user.role] || 0) + 1 }), {}), [users]);
  return <div className="page-stack"><section className="stats-grid people-stats"><StatCard label="People" value={users.length} hint="Accounts in CampusOps" icon={Users} tone="mint" /><StatCard label="Organizers" value={counts.organizer || 0} hint="Creating campus moments" icon={CalendarDays} tone="lavender" /><StatCard label="Volunteers" value={counts.volunteer || 0} hint="Making it all happen" icon={Check} tone="peach" /><StatCard label="Participants" value={counts.participant || 0} hint="Part of the community" icon={TicketCheck} tone="sky" /></section><section className="panel table-panel"><div className="panel-heading"><div><span className="section-kicker">CAMPUS DIRECTORY</span><h2>People and permissions</h2></div><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Add account</button></div><InlineError error={error} retry={load} />{loading ? <LoadingLine /> : users.length ? <div className="table-scroll"><table><thead><tr><th>Person</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>{users.map((person) => <tr key={person.id}><td><div className="person-cell"><span className="avatar avatar-table">{person.name?.slice(0, 1)}</span><b>{person.name}</b></div></td><td>{person.email}</td><td><span className={`role-pill role-${person.role}`}>{person.role}</span></td><td>{formatDate(person.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title="No accounts yet" description="Create the first account for your campus team." />}</section>{showForm && <UserDialog onClose={() => setShowForm(false)} onSave={createUser} />}</div>;
}

function UserDialog({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'organizer' });
  return <div className="modal-scrim"><section className="modal-card" role="dialog" aria-modal="true"><div className="modal-heading"><div><span className="section-kicker">CAMPUS DIRECTORY</span><h2>Create an account</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><label className="field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label className="field"><span>Temporary password</span><input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><label className="field"><span>Role</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin</option><option value="organizer">Organizer</option><option value="volunteer">Volunteer</option></select></label><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary">Create account</button></div></form></section></div>;
}



