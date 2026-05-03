import React, { useEffect, useMemo, useState } from "react";
import {
  Home,
  Activity,
  Database,
  CalendarDays,
  Settings,
  User,
  Wifi,
  Battery,
  Signal,
  AlertTriangle,
  PhoneCall,
  RefreshCw,
  Search,
  Bell,
  Trash2,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "https://fallsafe-thesis.onrender.com";

export default function App() {
  const [page, setPage] = useState("overview");
  const [latest, setLatest] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const latestRes = await fetch(`${API}/api/latest`);
      const latestData = await latestRes.json();

      const logsRes = await fetch(`${API}/api/logs`);
      const logsData = await logsRes.json();

      setLatest(latestData.message ? null : latestData);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      console.error("API error:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestData = async (type = "normal") => {
    const payload = {
      device_id: "ESP32-FD-001",
      fall: type === "fall" ? 1 : 0,
      sos: type === "sos" ? 1 : 0,
      battery: Math.floor(Math.random() * 35) + 60,
      gsm: Math.floor(Math.random() * 30) + 65,
    };

    await fetch(`${API}/api/device-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    loadData();
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    const text = `${log.device_id} ${log.time} ${log.fall} ${log.sos}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const isOnline = latest !== null;

  return (
    <div className="min-h-screen bg-[#dfeade] p-4 text-white">
      <div className="min-h-[calc(100vh-2rem)] rounded-[32px] bg-[#0b0d0c] p-5 md:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="text-3xl font-black">
              <span className="text-[#dfeade]">fall</span>safe
            </h1>
            <p className="text-sm text-zinc-500">
              {latest
                ? `${latest.device_id} • Last update: ${latest.time}`
                : "No device • Last update: No data yet"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex">
              <Search size={16} className="text-zinc-500" />
              <input
                className="bg-transparent text-sm outline-none placeholder:text-zinc-600"
                placeholder="Search logs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              onClick={loadData}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={() => setPage("profile")}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#dfeade] text-black"
            >
              <User size={20} />
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[90px_1fr]">
          <aside className="flex gap-4 rounded-[28px] border border-white/10 bg-[#111412] p-4 lg:flex-col">
            <SideButton icon={Home} active={page === "overview"} onClick={() => setPage("overview")} />
            <SideButton icon={Activity} active={page === "activity"} onClick={() => setPage("activity")} />
            <SideButton icon={Database} active={page === "logs"} onClick={() => setPage("logs")} />
            <SideButton icon={CalendarDays} active={page === "calendar"} onClick={() => setPage("calendar")} />
            <SideButton icon={Settings} active={page === "settings"} onClick={() => setPage("settings")} />
          </aside>

          <main>
            {page === "overview" && (
              <Overview
                latest={latest}
                logs={filteredLogs}
                isOnline={isOnline}
                loading={loading}
                loadData={loadData}
                sendTestData={sendTestData}
              />
            )}

            {page === "activity" && <ActivityPage logs={filteredLogs} />}
            {page === "logs" && <LogsPage logs={filteredLogs} />}
            {page === "calendar" && <CalendarPage logs={logs} />}
            {page === "settings" && <SettingsPage api={API} />}
            {page === "profile" && <ProfilePage />}
          </main>
        </div>
      </div>
    </div>
  );
}

function SideButton({ icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`grid h-14 w-14 place-items-center rounded-2xl transition ${
        active ? "bg-[#dfeade] text-black" : "text-zinc-500 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={22} />
    </button>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-[28px] border border-white/10 bg-[#111412] p-6 ${className}`}>
      {children}
    </div>
  );
}

function Overview({ latest, logs, isOnline, loading, loadData, sendTestData }) {
  const fallCount = logs.filter((log) => log.fall === 1).length;
  const sosCount = logs.filter((log) => log.sos === 1).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-6xl font-light tracking-tight">Overview</h1>
          <p className="mt-3 text-zinc-500">
            {latest
              ? `${latest.device_id} • Last update: ${latest.time}`
              : "No device • Last update: No data yet"}
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm"
        >
          <RefreshCw size={16} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <StatusCard title="Device" value={isOnline ? "Online" : "Offline"} subtitle="Connection status" icon={Wifi} />
        <StatusCard title="Battery" value={latest ? `${latest.battery}%` : "--"} subtitle="Battery level" icon={Battery} light />
        <StatusCard title="GSM" value={latest ? `${latest.gsm}%` : "--"} subtitle="Signal strength" icon={Signal} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <h2 className="text-2xl font-light">Emergency Test</h2>
          <p className="mt-2 text-zinc-500">Use these buttons until ESP32 is connected.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button
              onClick={() => sendTestData("normal")}
              className="rounded-2xl bg-[#dfeade] px-5 py-4 font-medium text-black"
            >
              Send Normal Data
            </button>

            <button
              onClick={() => sendTestData("fall")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/20 px-5 py-4 font-medium text-red-200"
            >
              <AlertTriangle size={18} />
              Fall Detected
            </button>

            <button
              onClick={() => sendTestData("sos")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500/20 px-5 py-4 font-medium text-orange-200"
            >
              <PhoneCall size={18} />
              SOS Pressed
            </button>
          </div>
        </Card>

        <Card className="bg-[#dfeade] text-black">
          <h2 className="text-5xl font-light">{logs.length}</h2>
          <p className="mt-2 text-black/60">Stored events</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-3xl">{fallCount}</p>
              <p className="text-black/60">Fall events</p>
            </div>
            <div>
              <p className="text-3xl">{sosCount}</p>
              <p className="text-black/60">SOS events</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <LogsPage logs={logs.slice(0, 5)} small />
      </div>
    </div>
  );
}

function StatusCard({ title, value, subtitle, icon: Icon, light }) {
  return (
    <Card className={light ? "bg-[#dfeade] text-black" : ""}>
      <div className="flex items-start justify-between">
        <div>
          <p className={light ? "text-black/60" : "text-zinc-500"}>{title}</p>
          <h2 className="mt-8 text-5xl font-light">{value}</h2>
          <p className={`mt-2 text-sm ${light ? "text-black/60" : "text-zinc-500"}`}>{subtitle}</p>
        </div>

        <div className={`grid h-14 w-14 place-items-center rounded-full ${light ? "bg-black text-white" : "bg-white/10"}`}>
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
}

function LogsPage({ logs, small = false }) {
  return (
    <Card>
      <h2 className="text-2xl font-light">{small ? "Recent Logs" : "Stored Logs"}</h2>

      <div className="mt-5 space-y-3">
        {logs.length === 0 && <p className="text-zinc-500">No logs yet.</p>}

        {logs.map((log) => {
          const event =
            log.fall === 1
              ? "Fall detected"
              : log.sos === 1
              ? "SOS button pressed"
              : "Normal device update";

          const style =
            log.fall === 1
              ? "bg-red-500/20 text-red-200"
              : log.sos === 1
              ? "bg-orange-500/20 text-orange-200"
              : "bg-[#dfeade]/10 text-[#dfeade]";

          return (
            <div key={log.id || `${log.device_id}-${log.time}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{event}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {log.device_id} • Battery {log.battery}% • GSM {log.gsm}%
                  </p>
                </div>

                <span className={`rounded-full px-3 py-1 text-sm ${style}`}>
                  {log.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ActivityPage({ logs }) {
  const falls = logs.filter((log) => log.fall === 1).length;
  const sos = logs.filter((log) => log.sos === 1).length;
  const normal = logs.length - falls - sos;

  return (
    <div>
      <h1 className="mb-8 text-6xl font-light">Activity</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard title="Falls" value={falls} subtitle="Detected events" icon={AlertTriangle} />
        <StatusCard title="SOS" value={sos} subtitle="Button presses" icon={PhoneCall} light />
        <StatusCard title="Normal" value={normal} subtitle="Regular updates" icon={Activity} />
      </div>

      <div className="mt-6">
        <LogsPage logs={logs} />
      </div>
    </div>
  );
}

function CalendarPage({ logs }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getDayEvents = (day) => {
    return logs.filter((log) => {
      if (!log.time) return false;

      const logDate = new Date(log.time.replace(" ", "T"));

      return (
        logDate.getDate() === day &&
        logDate.getMonth() === month &&
        logDate.getFullYear() === year
      );
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-6xl font-light">Calendar</h1>
        <p className="mt-2 text-zinc-500">
          {monthName} {year} — days with fall, SOS, battery or status events
        </p>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-3 text-center text-sm text-zinc-500">
        <p>Mon</p>
        <p>Tue</p>
        <p>Wed</p>
        <p>Thu</p>
        <p>Fri</p>
        <p>Sat</p>
        <p>Sun</p>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const events = getDayEvents(day);

          const hasFall = events.some((event) => event.fall === 1);
          const hasSos = events.some((event) => event.sos === 1);

          let bg = "bg-white/[0.03]";
          let border = "border-white/10";

          if (hasFall) {
            bg = "bg-red-500/20";
            border = "border-red-400/40";
          } else if (hasSos) {
            bg = "bg-orange-500/20";
            border = "border-orange-400/40";
          } else if (events.length > 0) {
            bg = "bg-green-500/20";
            border = "border-green-400/40";
          }

          return (
            <div
              key={day}
              className={`min-h-28 rounded-2xl border ${border} ${bg} p-4`}
            >
              <div className="text-2xl font-light">{day}</div>

              {events.length > 0 && (
                <div className="mt-3 space-y-1 text-xs">
                  <p>{events.length} event(s)</p>
                  {hasFall && <p className="text-red-200">Fall detected</p>}
                  {hasSos && <p className="text-orange-200">SOS pressed</p>}
                  {!hasFall && !hasSos && <p className="text-green-200">Normal update</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-400">
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-full bg-red-500" /> Fall
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-full bg-orange-500" /> SOS
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-full bg-green-500" /> Normal
        </span>
      </div>
    </div>
  );
}

function SettingsPage({ api }) {
  return (
    <div>
      <h1 className="mb-8 text-6xl font-light">Settings</h1>

      <Card>
        <h2 className="text-2xl font-light">System Configuration</h2>

        <div className="mt-6 space-y-4 text-sm text-zinc-400">
          <p>Backend API:</p>
          <code className="block rounded-2xl bg-black/40 p-4 text-[#dfeade]">
            {api}
          </code>

          <p>Device ID:</p>
          <code className="block rounded-2xl bg-black/40 p-4 text-[#dfeade]">
            ESP32-FD-001
          </code>
        </div>
      </Card>
    </div>
  );
}

function ProfilePage() {
  return (
    <div>
      <h1 className="mb-8 text-6xl font-light">Profile</h1>

      <Card>
        <h2 className="text-2xl font-light">Demo User</h2>
        <p className="mt-2 text-zinc-500">FallSafe monitoring account</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            placeholder="Email"
          />
          <input
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
          />
        </div>

        <button className="mt-5 rounded-2xl bg-[#dfeade] px-6 py-3 font-medium text-black">
          Login Demo
        </button>
      </Card>
    </div>
  );
}