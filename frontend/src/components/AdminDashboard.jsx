import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, ClipboardList, Settings, Search, LogOut, X, Eye,
  ChevronRight, ShieldCheck, RefreshCw, Info, Cpu
} from "lucide-react";

const INSPECTIONS_KEY = "fabrisense_inspections";

function loadInspections() {
  try {
    const raw = localStorage.getItem(INSPECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function computeStats(list) {
  const total = list.length;
  const withDefects = list.filter(i => (i.defects ?? 0) > 0).length;
  const defectFree = total - withDefects;
  const gradeA = list.filter(i => (i.grade || "").toUpperCase().includes("A")).length;
  const gradeB = list.filter(i => (i.grade || "").toUpperCase().includes("B")).length;
  const gradeC = list.filter(i => (i.grade || "").toUpperCase().includes("C")).length;
  return { total, withDefects, defectFree, gradeA, gradeB, gradeC };
}

const th = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  accent: "#2563eb",
  aLight: "#eff6ff",
  aBorder: "#bfdbfe",
  green: "#16a34a",
  gLight: "#f0fdf4",
  red: "#dc2626",
  rLight: "#fef2f2",
  amber: "#d97706",
  amLight: "#fffbeb",
};

const card = {
  backgroundColor: th.surface,
  border: `1px solid ${th.border}`,
  borderRadius: "12px",
  padding: "14px",
};

function gradeColor(grade) {
  const g = (grade || "").toUpperCase();
  if (g.includes("A")) return { color: th.green, bg: th.gLight };
  if (g.includes("C")) return { color: th.red, bg: th.rLight };
  return { color: th.amber, bg: th.amLight };
}

function statusColor(s) {
  const st = (s || "").toLowerCase();
  if (st === "passed" || st === "pass") return { color: th.green, bg: th.gLight, border: "#bbf7d0" };
  if (st === "failed" || st === "fail") return { color: th.red, bg: th.rLight, border: "#fecaca" };
  return { color: th.amber, bg: th.amLight, border: "#fde68a" };
}

function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      fontSize: "0.64rem", fontWeight: "700", padding: "2px 8px",
      borderRadius: "6px", backgroundColor: bg, color,
      border: `1px solid ${border || color + "44"}`,
    }}>{label}</span>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center", gap: "12px",
    }}>
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        backgroundColor: th.aLight, border: `1px solid ${th.aBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Cpu size={24} color={th.accent} />
      </div>
      <div style={{ fontSize: "0.92rem", fontWeight: "700", color: th.text }}>{title}</div>
      <div style={{ fontSize: "0.76rem", color: th.muted, maxWidth: "220px", lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  );
}

export function AdminDashboard({ userData = {}, onLogout }) {
  const [nav, setNav] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [inspections, setInspections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [gradeF, setGradeF] = useState("All");
  const [statusF, setStatusF] = useState("All");

  useEffect(() => { setInspections(loadInspections()); }, []);

  useEffect(() => {
    const t = setInterval(() => setInspections(loadInspections()), 10000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => setInspections(loadInspections());
  const stats = computeStats(inspections);

  const filtered = inspections.filter(item => {
    const q = search.toLowerCase();
    const ms =
      (item.id || "").toLowerCase().includes(q) ||
      (item.title || item.fabric || "").toLowerCase().includes(q) ||
      (item.inspector || "").toLowerCase().includes(q);
    const mg = gradeF === "All" || (item.grade || "").toUpperCase().includes(gradeF.replace("Grade ", ""));
    const mst = statusF === "All" || (item.status || "").toLowerCase().startsWith(statusF.toLowerCase());
    return ms && mg && mst;
  });

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inspections", label: "Inspections", icon: ClipboardList },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const tabStyle = (active) => ({
    display: "flex", alignItems: "center", gap: "6px",
    padding: "7px 14px", borderRadius: "20px",
    border: active ? `1px solid ${th.aBorder}` : "1px solid transparent",
    backgroundColor: active ? th.aLight : "transparent",
    color: active ? th.accent : th.muted,
    fontSize: "0.76rem", fontWeight: active ? "700" : "600",
    whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.15s",
  });

  const displayGrade = (g) =>
    (g || "B").toUpperCase().includes("A") ? "Grade A" :
    (g || "B").toUpperCase().includes("C") ? "Grade C" : "Grade B";

  const displayStatus = (item) =>
    item.status ||
    ((item.grade || "").toUpperCase().includes("A") ? "Passed" :
     (item.grade || "").toUpperCase().includes("C") ? "Failed" : "Review");

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      backgroundColor: th.bg, color: th.text,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      overflow: "hidden",
    }}>

      {/* TOP BAR */}
      <div style={{
        padding: "12px 16px", backgroundColor: th.surface,
        borderBottom: `1px solid ${th.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "8px",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(37,99,235,0.3)",
          }}>
            <ShieldCheck size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: "800", color: th.text, letterSpacing: "-0.01em" }}>FabriSense</div>
            <div style={{ fontSize: "0.58rem", fontWeight: "700", color: th.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={refresh} title="Refresh" style={{
            background: th.aLight, border: `1px solid ${th.aBorder}`,
            borderRadius: "8px", padding: "6px", cursor: "pointer",
            display: "flex", alignItems: "center",
          }}>
            <RefreshCw size={14} color={th.accent} />
          </button>
          <button onClick={onLogout} title="Logout" style={{
            background: th.rLight, border: "1px solid #fecaca",
            borderRadius: "8px", padding: "6px", cursor: "pointer",
            display: "flex", alignItems: "center",
          }}>
            <LogOut size={14} color={th.red} />
          </button>
        </div>
      </div>

      {/* STATUS STRIP */}
      <div style={{
        padding: "5px 16px", backgroundColor: th.surface,
        borderBottom: `1px solid ${th.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "0.68rem", color: th.muted, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
          <span>System Online</span>
        </div>
        <span>Admin: <strong style={{ color: th.text }}>{userData?.name || "Admin"}</strong></span>
      </div>

      {/* NAV TABS */}
      <div style={{
        display: "flex", gap: "4px", padding: "8px 12px",
        backgroundColor: th.surface, borderBottom: `1px solid ${th.border}`,
        overflowX: "auto", flexShrink: 0, scrollbarWidth: "none",
      }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setNav(id)} style={tabStyle(nav === id)}>
            <Icon size={13} /><span>{label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* ── DASHBOARD ── */}
        {nav === "dashboard" && (<>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "800", margin: "0 0 2px", color: th.text }}>Overview</h2>
            <p style={{ fontSize: "0.72rem", color: th.muted, margin: 0 }}>Live data from user fabric inspections</p>
          </div>

          {stats.total === 0
            ? <EmptyState title="No inspections yet" subtitle="Data appears here after users complete defect detection scans in the User Dashboard." />
            : (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Total Scans", value: stats.total, sub: "inspections logged", color: th.accent },
                  { label: "With Defects", value: stats.withDefects, sub: `${stats.total > 0 ? Math.round((stats.withDefects / stats.total) * 100) : 0}% anomaly rate`, color: th.red },
                  { label: "Defect-Free", value: stats.defectFree, sub: `${stats.total > 0 ? Math.round((stats.defectFree / stats.total) * 100) : 0}% clean rate`, color: th.green },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{ ...card, borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: "700", color: th.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: "0.68rem", color: th.muted, marginTop: "4px" }}>{sub}</div>
                  </div>
                ))}

                <div style={card}>
                  <div style={{ fontSize: "0.6rem", fontWeight: "700", color: th.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>Quality Grades</div>
                  {[
                    { label: "A", count: stats.gradeA, color: th.green },
                    { label: "B", count: stats.gradeB, color: th.amber },
                    { label: "C", count: stats.gradeC, color: th.red },
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", marginBottom: "4px" }}>
                      <span style={{ color, fontWeight: "700" }}>Grade {label}</span>
                      <span style={{ color: th.text, fontWeight: "700" }}>
                        {count} <span style={{ color: th.muted, fontWeight: "500" }}>({stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: "800", margin: 0, color: th.text }}>Recent Inspections</h3>
                  <span onClick={() => setNav("inspections")} style={{ fontSize: "0.72rem", color: th.accent, fontWeight: "700", cursor: "pointer" }}>View All →</span>
                </div>
                {inspections.slice(0, 5).map((item, i) => {
                  const gc = gradeColor(item.grade);
                  return (
                    <div key={i} onClick={() => setSelected(item)} style={{
                      padding: "10px 12px", borderRadius: "10px",
                      border: `1px solid ${th.border}`, backgroundColor: th.bg,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer", marginBottom: "8px",
                    }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: "700", color: th.accent }}>{item.id}</div>
                        <div style={{ fontSize: "0.7rem", color: th.muted, marginTop: "2px" }}>{item.title || item.fabric || "Fabric Scan"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700", backgroundColor: gc.bg, color: gc.color, padding: "2px 8px", borderRadius: "6px" }}>
                          {(item.grade || "B").toUpperCase().includes("A") ? "A" : (item.grade || "B").toUpperCase().includes("C") ? "C" : "B"}
                        </span>
                        <ChevronRight size={14} color={th.muted} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)
          }
        </>)}

        {/* ── INSPECTIONS ── */}
        {nav === "inspections" && (<>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: "800", margin: "0 0 2px", color: th.text }}>Inspection Logs</h2>
              <p style={{ fontSize: "0.72rem", color: th.muted, margin: 0 }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={refresh} style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "7px 12px",
              borderRadius: "10px", backgroundColor: th.aLight, border: `1px solid ${th.aBorder}`,
              color: th.accent, fontSize: "0.72rem", fontWeight: "700", cursor: "pointer",
            }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: th.surface, border: `1px solid ${th.border}`, borderRadius: "10px", padding: "8px 12px" }}>
            <Search size={14} color={th.muted} />
            <input
              type="text" placeholder="Search by ID, fabric, inspector…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", color: th.text, fontSize: "0.78rem", width: "100%", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>
            {["All", "Grade A", "Grade B", "Grade C"].map(g => (
              <button key={g} onClick={() => setGradeF(g)} style={{
                padding: "5px 12px", borderRadius: "16px", whiteSpace: "nowrap",
                border: gradeF === g ? `1px solid ${th.aBorder}` : `1px solid ${th.border}`,
                backgroundColor: gradeF === g ? th.aLight : th.surface,
                color: gradeF === g ? th.accent : th.muted,
                fontSize: "0.7rem", fontWeight: "700", cursor: "pointer",
              }}>{g}</button>
            ))}
            {["All", "Passed", "Review", "Failed"].map(s => (
              <button key={s} onClick={() => setStatusF(s)} style={{
                padding: "5px 12px", borderRadius: "16px", whiteSpace: "nowrap",
                border: statusF === s ? `1px solid ${th.aBorder}` : `1px solid ${th.border}`,
                backgroundColor: statusF === s ? th.aLight : th.surface,
                color: statusF === s ? th.accent : th.muted,
                fontSize: "0.7rem", fontWeight: "700", cursor: "pointer",
              }}>{s}</button>
            ))}
          </div>

          {filtered.length === 0
            ? <EmptyState
                title={inspections.length === 0 ? "No inspections yet" : "No results found"}
                subtitle={inspections.length === 0
                  ? "When users complete a fabric defect scan, it will appear here automatically."
                  : "Try changing your search or filter options."}
              />
            : filtered.map((item, i) => {
                const gc = gradeColor(item.grade);
                const dg = displayGrade(item.grade);
                const ds = displayStatus(item);
                const sc = statusColor(ds);
                return (
                  <div key={i} style={{ ...card, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "800", color: th.accent }}>{item.id}</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Badge label={dg} color={gc.color} bg={gc.bg} />
                        <Badge label={ds} color={sc.color} bg={sc.bg} border={sc.border} />
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "700", color: th.text }}>{item.title || item.fabric || "Fabric Scan"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: th.muted }}>
                      <span>Defects: <strong style={{ color: (item.defects ?? 0) > 0 ? th.red : th.green }}>{item.defects ?? 0}</strong></span>
                      <span>{item.time || item.date || ""}</span>
                    </div>
                    <div style={{ paddingTop: "8px", borderTop: `1px solid ${th.border}` }}>
                      <button onClick={() => setSelected(item)} style={{
                        width: "100%", padding: "7px", borderRadius: "8px",
                        backgroundColor: th.aLight, border: `1px solid ${th.aBorder}`,
                        color: th.accent, fontSize: "0.74rem", fontWeight: "700", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                      }}>
                        <Eye size={13} /> View Details
                      </button>
                    </div>
                  </div>
                );
              })
          }
        </>)}

        {/* ── SETTINGS ── */}
        {nav === "settings" && (<>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "800", margin: "0 0 2px", color: th.text }}>Settings</h2>
            <p style={{ fontSize: "0.72rem", color: th.muted, margin: 0 }}>Account and data preferences</p>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: "800", margin: "0 0 12px", color: th.text }}>Account</h3>
            {[
              { label: "Name", value: userData?.name || "Admin" },
              { label: "Email", value: userData?.email || "admin@fabrisense.com" },
              { label: "Role", value: "Administrator" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                paddingBottom: "10px", marginBottom: "10px", borderBottom: `1px solid ${th.border}`,
                fontSize: "0.78rem",
              }}>
                <span style={{ color: th.muted, fontWeight: "600" }}>{label}</span>
                <span style={{ color: th.text, fontWeight: "700" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: "800", margin: "0 0 10px", color: th.text }}>Data Management</h3>
            <div style={{
              display: "flex", gap: "8px", padding: "10px", borderRadius: "8px",
              backgroundColor: th.aLight, border: `1px solid ${th.aBorder}`,
              fontSize: "0.74rem", marginBottom: "12px", alignItems: "flex-start",
            }}>
              <Info size={14} color={th.accent} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ color: th.accent }}>Inspection data is stored locally and grows as users complete fabric scans.</span>
            </div>
            <button onClick={() => {
              if (window.confirm("Delete all local inspection records? This cannot be undone.")) {
                localStorage.removeItem(INSPECTIONS_KEY);
                setInspections([]);
              }
            }} style={{
              width: "100%", padding: "10px", borderRadius: "10px",
              backgroundColor: th.rLight, border: "1px solid #fecaca",
              color: th.red, fontWeight: "700", fontSize: "0.78rem", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>
              Clear All Inspection Data
            </button>
          </div>

          <button onClick={onLogout} style={{
            width: "100%", padding: "12px", borderRadius: "12px",
            backgroundColor: th.surface, border: `1px solid ${th.border}`,
            color: th.red, fontWeight: "700", fontSize: "0.85rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}>
            <LogOut size={16} /> Sign Out
          </button>
        </>)}
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100,
          backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", backgroundColor: th.surface,
            borderRadius: "20px 20px 0 0", border: `1px solid ${th.border}`,
            padding: "20px 16px 28px",
            display: "flex", flexDirection: "column", gap: "14px",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.92rem", fontWeight: "800", color: th.accent }}>{selected.id}</span>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X size={20} color={th.muted} />
              </button>
            </div>
            <div style={{ fontSize: "1rem", fontWeight: "800", color: th.text }}>
              {selected.title || selected.fabric || "Fabric Scan"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Grade", value: selected.grade || "B" },
                { label: "Defects", value: selected.defects ?? 0 },
                { label: "Status", value: selected.status || displayStatus(selected) },
                { label: "Inspector", value: selected.inspector || userData?.name || "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: "10px", borderRadius: "10px",
                  backgroundColor: th.bg, border: `1px solid ${th.border}`,
                }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: "600", color: th.muted, textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "800", color: th.text }}>{value}</div>
                </div>
              ))}
            </div>
            {selected.time && <div style={{ fontSize: "0.7rem", color: th.muted }}>Recorded: {selected.time}</div>}
            <button onClick={() => setSelected(null)} style={{
              width: "100%", padding: "11px", borderRadius: "12px",
              backgroundColor: th.surface, border: `1px solid ${th.border}`,
              color: th.text, fontWeight: "700", fontSize: "0.82rem", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
