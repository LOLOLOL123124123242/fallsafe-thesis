import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, BatteryMedium, Bell, CalendarDays, CheckCircle2,
  CircleHelp, Database, Download, Home, Lock, LogIn, LogOut, Mail, MapPin, PhoneCall, RefreshCcw,
  Search, Settings, ShieldAlert, Trash2, UserRound, Wifi
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import './styles.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function SidebarButton({ icon: Icon, active, onClick, label }) {
  return <button title={label} onClick={onClick} className={`side-btn ${active ? 'active' : ''}`}><Icon size={20} /></button>
}

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>
}

function StatCard({ title, value, subtitle, icon: Icon, light }) {
  return (
    <Card className={light ? 'light-card stat-card' : 'stat-card'}>
      <div>
        <p className="muted">{title}</p>
        <h3>{value}</h3>
        <p className="muted small">{subtitle}</p>
      </div>
      <div className="stat-icon"><Icon size={21} /></div>
    </Card>
  )
}

function DeviceModel({ online }) {
  return (
    <div className="device-model">
      <div className="grid-bg" />
      <div className="chip main-chip" />
      <div className="chip small-chip" />
      <div className="chip round-chip" />
      <div className={`scan-line ${online ? 'scan-on' : ''}`} />
      <p>{online ? 'ESP32 + GSM online' : 'Device offline'}</p>
    </div>
  )
}

function buildWeekly(logs) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const map = days.map(day => ({ day, falls: 0, sos: 0, battery: 0 }))
  logs.forEach(log => {
    const d = new Date(log.created_at || log.timestamp || Date.now())
    const idx = (d.getDay() + 6) % 7
    if (log.fall || log.event_type === 'fall') map[idx].falls += 1
    if (log.sos || log.event_type === 'sos') map[idx].sos += 1
    if (log.event_type === 'battery') map[idx].battery += 1
  })
  return map
}

function csvDownload(logs) {
  const header = 'time,device_id,event,battery,gsm_signal,latitude,longitude,acknowledged\n'
  const rows = logs.map(l => [
    l.created_at, l.device_id, l.event_type, l.battery, l.gsm_signal,
    l.latitude ?? '', l.longitude ?? '', l.acknowledged
  ].map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fallsafe_logs.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')
  const [query, setQuery] = useState('')
  const [latest, setLatest] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiStatus, setApiStatus] = useState('Connecting')
  const [time, setTime] = useState(nowTime())
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fallsafe_user')) } catch { return null }
  })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })


  function handleLogin(e) {
    e.preventDefault()
    const demoUser = {
      name: loginForm.email ? loginForm.email.split('@')[0] : 'Thesis User',
      email: loginForm.email || 'student@fallsafe.local',
      role: 'Administrator'
    }
    localStorage.setItem('fallsafe_user', JSON.stringify(demoUser))
    setUser(demoUser)
    setLoginForm({ email: '', password: '' })
  }

  function handleDemoLogin() {
    const demoUser = { name: 'Salman', email: 'demo@fallsafe.local', role: 'Administrator' }
    localStorage.setItem('fallsafe_user', JSON.stringify(demoUser))
    setUser(demoUser)
  }

  function handleLogout() {
    localStorage.removeItem('fallsafe_user')
    setUser(null)
  }

  async function loadData() {
    try {
      const [latestRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/latest`),
        fetch(`${API_BASE}/api/logs?limit=100`)
      ])
      if (!latestRes.ok || !logsRes.ok) throw new Error('API error')
      const latestJson = await latestRes.json()
      const logsJson = await logsRes.json()
      setLatest(latestJson.data)
      setLogs(logsJson.data || [])
      setApiStatus('Online')
    } catch (error) {
      setApiStatus('Offline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const poll = setInterval(loadData, 3000)
    const clock = setInterval(() => setTime(nowTime()), 1000)
    return () => { clearInterval(poll); clearInterval(clock) }
  }, [])

  async function sendTestEvent(eventType) {
    const body = {
      device_id: latest?.device_id || 'ESP32-FD-001',
      fall: eventType === 'fall',
      sos: eventType === 'sos',
      battery: eventType === 'battery' ? 24 : (latest?.battery ?? 83),
      gsm_signal: latest?.gsm_signal ?? 78,
      latitude: latest?.latitude ?? null,
      longitude: latest?.longitude ?? null
    }
    await fetch(`${API_BASE}/api/device-data`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    loadData()
  }

  async function acknowledgeAll() {
    await fetch(`${API_BASE}/api/acknowledge-all`, { method: 'POST' })
    loadData()
  }

  async function clearLogs() {
    if (!confirm('Clear all stored logs?')) return
    await fetch(`${API_BASE}/api/logs`, { method: 'DELETE' })
    loadData()
  }

  const deviceId = latest?.device_id || 'No device'
  const online = apiStatus === 'Online' && latest?.status !== 'offline'
  const battery = latest?.battery ?? 0
  const gsm = latest?.gsm_signal ?? 0
  const lastSeen = latest?.created_at ? new Date(latest.created_at).toLocaleString() : 'No data yet'

  const filteredLogs = logs.filter(log =>
    `${log.device_id} ${log.event_type} ${log.created_at}`.toLowerCase().includes(query.toLowerCase())
  )
  const fallCount = logs.filter(l => l.event_type === 'fall').length
  const sosCount = logs.filter(l => l.event_type === 'sos').length
  const unacknowledged = logs.filter(l => !l.acknowledged && ['fall', 'sos', 'battery'].includes(l.event_type)).length
  const weekly = useMemo(() => buildWeekly(logs), [logs])
  const signalData = logs.slice(0, 12).reverse().map((l, i) => ({ t: i + 1, value: l.gsm_signal || 0 }))

  return (
    <div className="page-bg">
      <div className="app-shell">
        <header className="header">
          <div className="brand-wrap">
            <div className="brand"><span>fall</span>safe</div>
            <div className={`status-dot ${apiStatus.toLowerCase()}`}>{apiStatus}</div>{user && <div className="user-chip">{user.name}</div>}
          </div>
          <div className="header-actions">
            <div className="search-wrap"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search logs" /></div>
            <button onClick={loadData} className="icon-btn"><RefreshCcw size={18}/></button>
            <button title="Profile / Login" onClick={() => setActivePage('profile')} className="avatar"><UserRound size={20} /></button>
          </div>
        </header>

        <div className="layout">
          <aside className="sidebar">
            <SidebarButton label="Overview" active={activePage === 'overview'} onClick={() => setActivePage('overview')} icon={Home} />
            <SidebarButton label="Activity" active={activePage === 'activity'} onClick={() => setActivePage('activity')} icon={Activity} />
            <SidebarButton label="Logs" active={activePage === 'logs'} onClick={() => setActivePage('logs')} icon={Database} />
            <SidebarButton label="Calendar" active={activePage === 'calendar'} onClick={() => setActivePage('calendar')} icon={CalendarDays} />
            <SidebarButton label="Settings" active={activePage === 'settings'} onClick={() => setActivePage('settings')} icon={Settings} />
            <div className="spacer" />
            <SidebarButton label="Help" active={activePage === 'help'} onClick={() => setActivePage('help')} icon={CircleHelp} />
          </aside>

          <main className="main">
            <section className="title-row">
              <div>
                <h1>{activePage === 'profile' ? (user ? 'Profile' : 'Login') : activePage.charAt(0).toUpperCase() + activePage.slice(1)}</h1>
                <p>{deviceId} • Last update: {lastSeen}</p>
              </div>
              <div className="time-box"><strong>{time}</strong><span>Time</span></div>
            </section>

            {loading && <Card className="loading-card">Loading device data...</Card>}

            {activePage === 'overview' && (
              <>
                <section className="stats-grid">
                  <StatCard title="Device" value={online ? 'Online' : 'Offline'} subtitle="Connection status" icon={Wifi} />
                  <StatCard title="Battery" value={`${battery}%`} subtitle={battery > 30 ? 'Normal' : 'Low'} icon={BatteryMedium} light />
                  <StatCard title="Alerts" value={unacknowledged} subtitle="Need attention" icon={ShieldAlert} />
                </section>

                <section className="content-grid">
                  <Card className="activity-card">
                    <div className="card-head">
                      <div><h2>Activity</h2><p>Weekly device events</p></div>
                    </div>
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekly}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="day" stroke="#71717a" tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: '#111412', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16 }} />
                          <Bar dataKey="falls" radius={[8, 8, 0, 0]} fill="#f97316" />
                          <Bar dataKey="sos" radius={[8, 8, 0, 0]} fill="#ef4444" />
                          <Bar dataKey="battery" radius={[8, 8, 0, 0]} fill="#dfeade" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="legend"><span className="fall-dot"/>Fall <span className="sos-dot"/>SOS <span className="battery-dot"/>Battery</div>
                  </Card>

                  <Card>
                    <div className="card-head"><div><h2>GSM</h2><p>Network signal</p></div></div>
                    <DeviceModel online={online} />
                    <div className="signal-row"><span>Signal strength</span><b>{gsm}%</b></div>
                    <div className="progress"><span style={{ width: `${gsm}%` }} /></div>
                  </Card>
                </section>

                <section className="bottom-grid">
                  <StatCard title="Location" value={latest?.latitude && latest?.longitude ? 'Available' : 'Waiting'} subtitle={latest?.latitude && latest?.longitude ? `${latest.latitude}, ${latest.longitude}` : 'GPS module later'} icon={MapPin} light />
                  <Card>
                    <div className="card-head"><div><h2>Signal History</h2><p>Latest GSM readings</p></div></div>
                    <div className="signal-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={signalData}>
                          <defs><linearGradient id="signal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dfeade" stopOpacity={0.5}/><stop offset="95%" stopColor="#dfeade" stopOpacity={0}/></linearGradient></defs>
                          <XAxis dataKey="t" stroke="#71717a" tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: '#111412', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16 }} />
                          <Area type="monotone" dataKey="value" stroke="#dfeade" strokeWidth={2} fill="url(#signal)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </section>
              </>
            )}

            {activePage === 'activity' && (
              <section className="page-grid">
                <Card>
                  <div className="card-head"><div><h2>Fall and SOS activity</h2><p>Events grouped by weekday</p></div></div>
                  <div className="large-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekly}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="day" stroke="#71717a" tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#111412', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16 }} />
                        <Bar dataKey="falls" fill="#f97316" radius={[10,10,0,0]} />
                        <Bar dataKey="sos" fill="#ef4444" radius={[10,10,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card>
                  <div className="card-head"><div><h2>GSM signal</h2><p>Latest readings from device</p></div></div>
                  <div className="large-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={signalData}>
                        <defs><linearGradient id="signal2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dfeade" stopOpacity={0.5}/><stop offset="95%" stopColor="#dfeade" stopOpacity={0}/></linearGradient></defs>
                        <XAxis dataKey="t" stroke="#71717a" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#111412', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16 }} />
                        <Area type="monotone" dataKey="value" stroke="#dfeade" strokeWidth={2} fill="url(#signal2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </section>
            )}

            {activePage === 'logs' && (
              <Card>
                <div className="card-head compact-head">
                  <div><h2>Stored logs</h2><p>Data saved by Flask API and SQLite</p></div>
                  <div className="mini-actions wide-actions">
                    <button onClick={acknowledgeAll}>Acknowledge</button>
                    <button onClick={() => csvDownload(logs)}>Export CSV</button>
                    <button onClick={clearLogs}>Clear</button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Time</th><th>Device</th><th>Event</th><th>Battery</th><th>GSM</th><th>Location</th><th>Status</th></tr></thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <tr key={log.id}>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>{log.device_id}</td>
                          <td>{log.event_type}</td>
                          <td>{log.battery ?? '-'}%</td>
                          <td>{log.gsm_signal ?? '-'}%</td>
                          <td>{log.latitude && log.longitude ? `${log.latitude}, ${log.longitude}` : '-'}</td>
                          <td>{log.acknowledged ? 'Checked' : 'New'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLogs.length === 0 && <p className="empty table-empty">No logs found.</p>}
                </div>
              </Card>
            )}

            {activePage === 'calendar' && (
              <Card>
                <div className="card-head"><div><h2>Calendar</h2><p>Days with fall, SOS, battery or status events</p></div></div>
                <div className="calendar-grid">
                  {Array.from({ length: 35 }).map((_, i) => {
                    const day = i + 1
                    const count = logs.filter(l => new Date(l.created_at).getDate() === day).length
                    return <div key={day} className={`calendar-cell ${count ? 'has-events' : ''}`}><b>{day}</b><span>{count ? `${count} event${count > 1 ? 's' : ''}` : ''}</span></div>
                  })}
                </div>
              </Card>
            )}

            {activePage === 'settings' && (
              <section className="page-grid two">
                <Card>
                  <h2>API settings</h2>
                  <div className="settings-list">
                    <div><span>API URL</span><b>{API_BASE}</b></div>
                    <div><span>Polling</span><b>Every 3 seconds</b></div>
                    <div><span>Device</span><b>{deviceId}</b></div>
                  </div>
                </Card>
                <Card>
                  <h2>Device settings</h2>
                  <div className="settings-list">
                    <div><span>GSM module</span><b>{gsm ? 'Connected' : 'No data'}</b></div>
                    <div><span>GPS module</span><b>{latest?.latitude && latest?.longitude ? 'Connected' : 'Not added yet'}</b></div>
                    <div><span>Last update</span><b>{lastSeen}</b></div>
                  </div>
                </Card>
              </section>
            )}


            {activePage === 'profile' && (
              <section className="page-grid two">
                <Card className="login-card">
                  {!user ? (
                    <>
                      <div className="login-icon"><Lock size={26} /></div>
                      <h2>Login</h2>
                      <p className="login-subtitle">Access the FallSafe monitoring dashboard.</p>
                      <form onSubmit={handleLogin} className="login-form">
                        <label>
                          <span>Email</span>
                          <div className="input-row"><Mail size={18} /><input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="your@email.com" /></div>
                        </label>
                        <label>
                          <span>Password</span>
                          <div className="input-row"><Lock size={18} /><input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="••••••••" /></div>
                        </label>
                        <button className="primary-btn" type="submit"><LogIn size={18} /> Login</button>
                        <button className="secondary-btn" type="button" onClick={handleDemoLogin}>Use demo account</button>
                      </form>
                    </>
                  ) : (
                    <>
                      <div className="profile-avatar"><UserRound size={34} /></div>
                      <h2>{user.name}</h2>
                      <p className="login-subtitle">{user.email}</p>
                      <div className="settings-list">
                        <div><span>Role</span><b>{user.role}</b></div>
                        <div><span>Access</span><b>Dashboard, Logs, Settings</b></div>
                        <div><span>Session</span><b>Saved in browser</b></div>
                      </div>
                      <button className="danger-btn" onClick={handleLogout}><LogOut size={18} /> Logout</button>
                    </>
                  )}
                </Card>
                <Card>
                  <h2>Account purpose</h2>
                  <div className="help-list">
                    <p>This login is for thesis prototype demonstration.</p>
                    <p>It protects the dashboard interface locally and shows how real authentication will work.</p>
                    <p>For deployment, this can be replaced with Supabase Auth or Firebase Auth.</p>
                  </div>
                </Card>
              </section>
            )}

            {activePage === 'help' && (
              <Card>
                <h2>Help</h2>
                <div className="help-list">
                  <p>1. Start the Flask backend first.</p>
                  <p>2. Start the React frontend.</p>
                  <p>3. Use the emergency test buttons to insert real rows into SQLite.</p>
                  <p>4. Later, ESP32 will send the same HTTP POST request by GSM.</p>
                </div>
              </Card>
            )}
          </main>

          <section className="right-panel">
            <Card>
              <div className="card-head"><h2>Emergency</h2><Bell className="danger" /></div>
              <div className="emergency-list">
                <button onClick={() => sendTestEvent('fall')} className="emergency fall"><span><b>Fall test</b><small>POST /api/device-data</small></span><AlertTriangle /></button>
                <button onClick={() => sendTestEvent('sos')} className="emergency sos"><span><b>SOS test</b><small>POST /api/device-data</small></span><PhoneCall /></button>
                <button onClick={() => sendTestEvent('battery')} className="emergency battery"><span><b>Battery test</b><small>POST /api/device-data</small></span><BatteryMedium /></button>
              </div>
            </Card>

            <Card>
              <div className="card-head compact-head">
                <h2>Logs</h2>
                <div className="mini-actions">
                  <button title="Acknowledge all" onClick={acknowledgeAll}><CheckCircle2 size={17}/></button>
                  <button title="Export CSV" onClick={() => csvDownload(logs)}><Download size={17}/></button>
                  <button title="Clear logs" onClick={clearLogs}><Trash2 size={17}/></button>
                </div>
              </div>
              <div className="logs">
                {filteredLogs.length === 0 && <p className="empty">No logs.</p>}
                {filteredLogs.map(log => (
                  <div key={log.id} className={`log-item ${!log.acknowledged ? 'needs-check' : ''}`}>
                    <div><p>{log.event_type.toUpperCase()}</p><small>{log.device_id}</small></div>
                    <span className={log.event_type}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="ready-card">
              <h2>{fallCount}</h2><p>fall events</p>
              <h2>{sosCount}</h2><p>SOS events</p>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
