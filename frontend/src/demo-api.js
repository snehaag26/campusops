const STORAGE_KEY = 'campusops.demo-data.v1';

const future = (days, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

function seed() {
  const events = [
    { id: 1, title: 'Campus Innovation Fair', description: 'Meet student founders, explore new ideas, and connect with the people building what comes next.', venue: 'Innovation Hall', start_at: future(3, 10), end_at: future(3, 16), capacity: 180, created_by: 1, created_at: future(-25), registered_count: 86 },
    { id: 2, title: 'Design for Good Workshop', description: 'A hands-on afternoon turning community challenges into thoughtful design solutions.', venue: 'Studio B · Arts Building', start_at: future(6, 13), end_at: future(6, 16), capacity: 60, created_by: 1, created_at: future(-19), registered_count: 42 },
    { id: 3, title: 'Autumn Welcome Social', description: 'Music, food, and a warm welcome for everyone joining our campus community.', venue: 'Central Quad', start_at: future(9, 17), end_at: future(9, 20), capacity: 240, created_by: 1, created_at: future(-14), registered_count: 197 },
    { id: 4, title: 'Research Open House', description: 'Step inside campus labs and hear directly from the teams behind the research.', venue: 'Science Centre', start_at: future(13, 11), end_at: future(13, 15), capacity: 120, created_by: 1, created_at: future(-10), registered_count: 64 },
    { id: 5, title: 'Community Garden Day', description: 'Get your hands in the soil and help prepare the campus garden for spring.', venue: 'West Garden', start_at: future(16, 9), end_at: future(16, 12), capacity: 45, created_by: 2, created_at: future(-8), registered_count: 29 }
  ];
  const people = [
    { id: 3, name: 'Maya Patel', email: 'maya.patel@campus.edu', role: 'participant', created_at: future(-40) },
    { id: 4, name: 'Jordan Lee', email: 'jordan.lee@campus.edu', role: 'participant', created_at: future(-38) },
    { id: 5, name: 'Sam Rivera', email: 'sam.rivera@campus.edu', role: 'participant', created_at: future(-32) },
    { id: 6, name: 'Noah Kim', email: 'noah.kim@campus.edu', role: 'participant', created_at: future(-28) },
    { id: 7, name: 'Ava Thompson', email: 'ava.thompson@campus.edu', role: 'participant', created_at: future(-20) }
  ];
  const registrations = [
    { id: 1, eventId: 1, userId: 3, name: people[0].name, email: people[0].email, status: 'checked_in', registeredAt: future(-5), qrToken: 'DEMO-QR-001' },
    { id: 2, eventId: 1, userId: 4, name: people[1].name, email: people[1].email, status: 'registered', registeredAt: future(-4), qrToken: 'DEMO-QR-002' },
    { id: 3, eventId: 1, userId: 5, name: people[2].name, email: people[2].email, status: 'registered', registeredAt: future(-3), qrToken: 'DEMO-QR-003' },
    { id: 4, eventId: 2, userId: 3, name: people[0].name, email: people[0].email, status: 'registered', registeredAt: future(-2), qrToken: 'DEMO-QR-004' },
    { id: 5, eventId: 3, userId: 6, name: people[3].name, email: people[3].email, status: 'registered', registeredAt: future(-1), qrToken: 'DEMO-QR-005' },
    { id: 6, eventId: 3, userId: 7, name: people[4].name, email: people[4].email, status: 'registered', registeredAt: future(-1), qrToken: 'DEMO-QR-006' }
  ];
  return {
    events, people,
    users: [{ id: 1, name: 'Alex Morgan', email: 'alex.morgan@campus.edu', role: 'admin', created_at: future(-90) }, { id: 2, name: 'Taylor Brooks', email: 'taylor.brooks@campus.edu', role: 'organizer', created_at: future(-60) }, ...people, { id: 8, name: 'Jordan Lee', email: 'jordan.lee@campus.edu', role: 'volunteer', created_at: future(-18) }],
    registrations,
    sessions: [
      { id: 1, event_id: 1, title: 'Small ideas, big impact', speaker: 'Dr. Nina Shah', start_at: future(3, 10, 30), end_at: future(3, 11, 15), capacity: 80, registered_count: 38 },
      { id: 2, event_id: 1, title: 'The student founder story', speaker: 'Eli Turner · Class of 2024', start_at: future(3, 12), end_at: future(3, 12, 45), capacity: 70, registered_count: 56 },
      { id: 3, event_id: 1, title: 'Build your first prototype', speaker: 'Campus Makers Club', start_at: future(3, 14), end_at: future(3, 15), capacity: 32, registered_count: 21 },
      { id: 4, event_id: 2, title: 'Designing with your community', speaker: 'Amara Okafor', start_at: future(6, 13, 15), end_at: future(6, 14, 15), capacity: 35, registered_count: 25 },
      { id: 5, event_id: 2, title: 'Make the idea tangible', speaker: 'Leo Chen', start_at: future(6, 14, 30), end_at: future(6, 15, 30), capacity: 25, registered_count: 17 }
    ],
    attendance: [{ id: 1, registrationId: 1, sessionId: 1, checked_in_at: future(3, 10, 35) }],
    certificates: []
  };
}

function readDb() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (value?.events && value?.registrations && value?.sessions) return value;
  } catch { /* Restore the sample workspace below. */ }
  const value = seed();
  writeDb(value);
  return value;
}

function writeDb(value) { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
function numeric(value) { return Number(value); }
function qrImage(token) {
  const chars = Array.from({ length: 169 }, (_, i) => ((i * 17 + token.length * 7 + token.charCodeAt(i % token.length)) % 5) < 2 ? '<rect x="' + (i % 13) * 8 + '" y="' + Math.floor(i / 13) * 8 + '" width="7" height="7"/>' : '').join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="104" height="104" viewBox="0 0 104 104"><rect width="104" height="104" fill="white"/><g fill="#24483d">${chars}</g><text x="52" y="101" text-anchor="middle" font-size="1">${token}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function currentUser(token) {
  const role = String(token || '').split(':')[1] || 'organizer';
  const db = readDb();
  return db.users.find((user) => user.role === role) || { id: 1, name: 'Alex Morgan', email: 'alex.morgan@campus.edu', role };
}

function eventCount(db, eventId) { return numeric(db.events.find((event) => event.id === eventId)?.registered_count || 0); }
function eventRecord(db, event) { return { ...event, registered_count: eventCount(db, event.id) }; }
function page(items, params, defaultLimit = 10) {
  const pageNumber = Math.max(1, numeric(params.get('page') || 1));
  const limit = Math.max(1, numeric(params.get('limit') || defaultLimit));
  return { items: items.slice((pageNumber - 1) * limit, pageNumber * limit), page: pageNumber, limit, total: items.length };
}
function regView(db, row) {
  const event = db.events.find((item) => item.id === row.eventId);
  return { ...row, eventTitle: event?.title || 'Campus event', venue: event?.venue || '', eventStartAt: event?.start_at || future(1), eventEndAt: event?.end_at || future(1, 12), qrCode: qrImage(row.qrToken) };
}

export async function demoApi(path, token, options = {}) {
  const db = readDb();
  const method = options.method || 'GET';
  const body = options.body || {};
  const url = new URL(path, 'http://demo.local');
  const route = url.pathname;
  const user = currentUser(token);
  const ok = (value) => { writeDb(db); return value; };

  if (route === '/auth/login') {
    const role = body.role || 'organizer';
    return { token: `demo:${role}`, user: currentUser(`demo:${role}`) };
  }
  if (route === '/auth/register') return { message: 'Demo accounts are not persisted as real accounts.' };
  if (route === '/auth/me') return user;

  if (route === '/events' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const result = db.events.map((event) => eventRecord(db, event)).filter((event) => !q || `${event.title} ${event.venue}`.toLowerCase().includes(q)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    const resultPage = page(result, url.searchParams, 10);
    return { events: resultPage.items, page: resultPage.page, limit: resultPage.limit, total: resultPage.total };
  }
  if (route === '/events' && method === 'POST') {
    const event = { id: Math.max(0, ...db.events.map((item) => item.id)) + 1, title: body.title, description: body.description || '', venue: body.venue, start_at: body.startAt, end_at: body.endAt, capacity: numeric(body.capacity), created_by: user.id, created_at: new Date().toISOString() };
    db.events.push(event); return ok(eventRecord(db, event));
  }
  const eventMatch = route.match(/^\/events\/(\d+)$/);
  if (eventMatch) {
    const id = numeric(eventMatch[1]);
    const event = db.events.find((item) => item.id === id);
    if (method === 'GET') return event ? eventRecord(db, event) : null;
    if (method === 'PUT' && event) { Object.assign(event, { title: body.title, description: body.description || '', venue: body.venue, start_at: body.startAt, end_at: body.endAt, capacity: numeric(body.capacity) }); return ok(eventRecord(db, event)); }
    if (method === 'DELETE' && event) { if (db.registrations.some((row) => row.eventId === id)) throw new Error('Event has registrations and cannot be deleted'); db.events = db.events.filter((item) => item.id !== id); db.sessions = db.sessions.filter((item) => item.event_id !== id); return ok({ message: 'Event deleted' }); }
  }

  if (route === '/registrations/me') return db.registrations.filter((row) => row.userId === user.id).map((row) => regView(db, row));
  const registrationEvent = route.match(/^\/registrations\/event\/(\d+)$/);
  if (registrationEvent) {
    const params = url.searchParams;
    const search = (params.get('search') || '').toLowerCase();
    let rows = db.registrations.filter((row) => row.eventId === numeric(registrationEvent[1]) && (!params.get('status') || row.status === params.get('status')) && (!search || `${row.name} ${row.email}`.toLowerCase().includes(search)));
    rows = rows.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    const result = page(rows, params);
    return { registrations: result.items, page: result.page, limit: result.limit, total: result.total };
  }
  if (route === '/registrations' && method === 'POST') {
    const eventId = numeric(body.eventId);
    if (db.registrations.some((row) => row.eventId === eventId && row.userId === user.id)) throw new Error('Already registered for this event');
    const row = { id: Math.max(0, ...db.registrations.map((item) => item.id)) + 1, eventId, userId: user.id, name: user.name, email: user.email, status: 'registered', registeredAt: new Date().toISOString(), qrToken: `DEMO-QR-${Date.now()}` };
    db.registrations.push(row); const event = db.events.find((item) => item.id === eventId); if (event) event.registered_count = numeric(event.registered_count) + 1; return ok({ id: row.id, eventId, status: row.status });
  }
  const registrationMatch = route.match(/^\/registrations\/(\d+)$/);
  if (registrationMatch && method === 'DELETE') {
    const row = db.registrations.find((item) => item.id === numeric(registrationMatch[1]));
    if (row && row.status !== 'cancelled') { row.status = 'cancelled'; const event = db.events.find((item) => item.id === row.eventId); if (event) event.registered_count = Math.max(0, numeric(event.registered_count) - 1); } return ok({ message: 'Registration cancelled' });
  }

  const sessionEvent = route.match(/^\/sessions\/event\/(\d+)$/);
  if (sessionEvent) return db.sessions.filter((session) => session.event_id === numeric(sessionEvent[1])).map((session) => ({ ...session, registered_count: session.registered_count || 0 }));
  if (route === '/sessions' && method === 'POST') {
    const session = { id: Math.max(0, ...db.sessions.map((item) => item.id)) + 1, event_id: numeric(body.eventId), title: body.title, speaker: body.speaker, start_at: body.startAt, end_at: body.endAt, capacity: numeric(body.capacity), registered_count: 0 };
    db.sessions.push(session); return ok(session);
  }
  const sessionJoin = route.match(/^\/sessions\/(\d+)\/register$/);
  if (sessionJoin && method === 'POST') {
    const session = db.sessions.find((item) => item.id === numeric(sessionJoin[1]));
    if (session) session.registered_count = numeric(session.registered_count) + 1;
    return ok({ message: 'Session registration saved' });
  }

  if (route === '/users' && method === 'GET') return db.users;
  if (route === '/users' && method === 'POST') {
    const person = { id: Math.max(0, ...db.users.map((item) => item.id)) + 1, name: body.name, email: body.email, role: body.role, created_at: new Date().toISOString() };
    db.users.push(person); return ok(person);
  }

  const attendanceSummary = route.match(/^\/attendance\/event\/(\d+)\/summary$/);
  if (attendanceSummary) {
    const eventId = numeric(attendanceSummary[1]);
    const sessions = db.sessions.filter((s) => s.event_id === eventId).map((s) => ({ session_id: s.id, title: s.title, start_at: s.start_at, attended_count: db.attendance.filter((a) => a.sessionId === s.id).length }));
    return { eventTotal: db.attendance.filter((a) => sessions.some((s) => s.session_id === a.sessionId)).length, sessions };
  }
  const noShows = route.match(/^\/attendance\/event\/(\d+)\/no-shows$/);
  if (noShows) {
    const eventId = numeric(noShows[1]);
    return db.registrations.filter((r) => r.eventId === eventId && r.status === 'registered').map((r) => ({ registration_id: r.id, name: r.name, email: r.email }));
  }
  const attendeeList = route.match(/^\/attendance\/session\/(\d+)$/);
  if (attendeeList) return db.attendance.filter((a) => a.sessionId === numeric(attendeeList[1])).map((a) => { const r = db.registrations.find((item) => item.id === a.registrationId); return { attendance_id: a.id, name: r?.name, email: r?.email, checked_in_at: a.checked_in_at }; });
  if (route === '/attendance/check-in' && method === 'POST') {
    const registration = db.registrations.find((r) => r.qrToken === body.qrToken && r.status !== 'cancelled');
    if (!registration) throw new Error('No active demo registration matches that QR token');
    const sessionId = numeric(body.sessionId);
    if (!db.sessions.some((s) => s.id === sessionId)) throw new Error('Session not found');
    const item = { id: Math.max(0, ...db.attendance.map((a) => a.id)) + 1, registrationId: registration.id, sessionId, checked_in_at: new Date().toISOString() };
    db.attendance.push(item); registration.status = 'checked_in';
    return ok({ participantName: registration.name, sessionTitle: db.sessions.find((s) => s.id === sessionId).title, checkedInAt: item.checked_in_at });
  }

  if (route === '/certificates/me') return db.certificates.filter((row) => row.userId === user.id).map((row) => ({ ...row, event_title: db.events.find((e) => e.id === row.eventId)?.title || 'Campus event', start_at: db.events.find((e) => e.id === row.eventId)?.start_at, eligible: row.eligible }));
  const evaluate = route.match(/^\/certificates\/event\/(\d+)\/evaluate$/);
  if (evaluate && method === 'POST') {
    const eventId = numeric(evaluate[1]);
    const rows = db.registrations.filter((r) => r.eventId === eventId);
    rows.forEach((row) => db.certificates.push({ id: Math.max(0, ...db.certificates.map((c) => c.id)) + 1, userId: row.userId, eventId, eligible: row.status === 'checked_in' }));
    return ok({ eligible: rows.filter((r) => r.status === 'checked_in').length, notEligible: rows.filter((r) => r.status !== 'checked_in').length });
  }

  return {};
}

export async function demoDownload(path, fileName) {
  const match = path.match(/^\/certificates\/(\d+)\/download$/);
  const db = readDb();
  const certificate = db.certificates.find((item) => item.id === numeric(match?.[1]));
  const event = db.events.find((item) => item.id === certificate?.eventId);
  const user = db.users.find((item) => item.id === certificate?.userId);
  const content = `CAMPUSOPS CERTIFICATE OF PARTICIPATION\n\nPresented to ${user?.name || 'Campus community member'}\nFor participating in ${event?.title || 'a CampusOps event'}\n\nDEMO PREVIEW — this sample is stored only in this browser.\n`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  link.download = fileName.replace(/\.pdf$/, '.txt');
  link.click();
  URL.revokeObjectURL(link.href);
}

export function resetDemoData() { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }
