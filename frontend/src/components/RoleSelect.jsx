import React, { useEffect, useState } from "react";
import logoImg from "../assets/logo.jpg";

export function RoleSelect({ onSelectUser, onSelectAdmin }) {
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (role) => {
    setPressed(role);
    setTimeout(() => {
      if (role === "user") onSelectUser();
      else onSelectAdmin();
    }, 280);
  };

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
      overflow: "hidden",
      background: "linear-gradient(160deg, #0a0e1a 0%, #0c1528 40%, #081420 100%)",
      position: "relative",
    }}>

      {/* ── Background ambient glow orbs ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
      }}>
        {/* Top-left green orb */}
        <div style={{
          position: "absolute", top: "-80px", left: "-60px",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,120,0.14) 0%, transparent 65%)",
        }} />
        {/* Bottom-right blue orb */}
        <div style={{
          position: "absolute", bottom: "-80px", right: "-60px",
          width: "340px", height: "340px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 65%)",
        }} />
        {/* Center glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── Fine grid texture ── */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.035, pointerEvents: "none" }}>
        <defs>
          <pattern id="grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* ════════ TOP SECTION: Header branding ════════ */}
      <div style={{
        padding: "calc(40px + env(safe-area-inset-top)) 28px 20px",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "10px", zIndex: 1, flexShrink: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
      }}>
        {/* Logo */}
        <div style={{
          width: "60px", height: "60px", borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,120,0.2)",
          flexShrink: 0,
        }}>
          <img src={logoImg} alt="FabriSense" style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "1.5rem", fontWeight: "800", color: "#ffffff",
            letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>FabriSense</div>
          <div style={{
            fontSize: "0.65rem", fontWeight: "600", color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.18em", textTransform: "uppercase", marginTop: "4px",
          }}>AI Fabric Inspection Platform</div>
        </div>
      </div>

      {/* ════════ MAIN CONTENT: Role cards ════════ */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", gap: "14px",
        padding: "0 22px 32px", zIndex: 1,
        minHeight: 0, overflowY: "auto",
        WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain", touchAction: "pan-y",
      }}>

        <div style={{
          textAlign: "center", marginBottom: "6px",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease 0.2s",
        }}>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: "0.02em" }}>
            Select your role to continue
          </p>
        </div>

        {/* ── USER CARD ── */}
        <div
          onClick={() => handleSelect("user")}
          onMouseEnter={() => setHovered("user")}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: "relative", overflow: "hidden",
            borderRadius: "20px", cursor: "pointer",
            background: pressed === "user"
              ? "linear-gradient(135deg, rgba(6,182,120,0.3) 0%, rgba(4,120,82,0.3) 100%)"
              : hovered === "user"
              ? "linear-gradient(135deg, rgba(6,182,120,0.2) 0%, rgba(4,120,82,0.18) 100%)"
              : "linear-gradient(135deg, rgba(6,182,120,0.12) 0%, rgba(4,120,82,0.10) 100%)",
            border: "1px solid",
            borderColor: pressed === "user" || hovered === "user"
              ? "rgba(6,182,120,0.55)"
              : "rgba(6,182,120,0.22)",
            padding: "20px 20px",
            transform: pressed === "user" ? "scale(0.975)" : "scale(1)",
            transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: visible ? 1 : 0,
            boxShadow: hovered === "user"
              ? "0 12px 40px rgba(6,182,120,0.2), 0 0 0 1px rgba(6,182,120,0.35)"
              : "0 4px 20px rgba(0,0,0,0.25)",
            transitionDelay: "0.15s",
          }}
        >
          {/* Subtle shimmer overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(135deg, rgba(6,182,120,0.08) 0%, transparent 60%)",
            borderRadius: "20px",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
            {/* Icon */}
            <div style={{
              width: "52px", height: "52px", borderRadius: "16px", flexShrink: 0,
              background: "linear-gradient(135deg, #06b678 0%, #047857 100%)",
              border: "1px solid rgba(6,182,120,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(6,182,120,0.35)",
            }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="9" r="5" fill="white" opacity="0.95" />
                <path d="M2 24 C2 17.4 7 13 13 13 C19 13 24 17.4 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em", marginBottom: "3px" }}>
                User
              </div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                Fabric inspection & quality reporting
              </div>
            </div>
            {/* Arrow */}
            <div style={{
              width: "32px", height: "32px", borderRadius: "10px",
              background: "rgba(6,182,120,0.18)",
              border: "1px solid rgba(6,182,120,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7H11M8 4l3 3-3 3" stroke="#06b678" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Bottom tag line */}
          <div style={{
            marginTop: "12px", paddingTop: "12px",
            borderTop: "1px solid rgba(6,182,120,0.15)",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#06b678", boxShadow: "0 0 6px #06b678" }} />
            <span style={{ fontSize: "0.67rem", color: "rgba(6,182,120,0.8)", fontWeight: "600", letterSpacing: "0.05em" }}>
              SIGN IN / REGISTER
            </span>
          </div>
        </div>

        {/* ── ADMIN CARD ── */}
        <div
          onClick={() => handleSelect("admin")}
          onMouseEnter={() => setHovered("admin")}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: "relative", overflow: "hidden",
            borderRadius: "20px", cursor: "pointer",
            background: pressed === "admin"
              ? "linear-gradient(135deg, rgba(37,99,235,0.3) 0%, rgba(29,78,216,0.3) 100%)"
              : hovered === "admin"
              ? "linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(29,78,216,0.18) 100%)"
              : "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(29,78,216,0.10) 100%)",
            border: "1px solid",
            borderColor: pressed === "admin" || hovered === "admin"
              ? "rgba(37,99,235,0.55)"
              : "rgba(37,99,235,0.22)",
            padding: "20px 20px",
            transform: pressed === "admin" ? "scale(0.975)" : "scale(1)",
            transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: visible ? 1 : 0,
            boxShadow: hovered === "admin"
              ? "0 12px 40px rgba(37,99,235,0.2), 0 0 0 1px rgba(37,99,235,0.35)"
              : "0 4px 20px rgba(0,0,0,0.25)",
            transitionDelay: "0.2s",
          }}
        >
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 60%)",
            borderRadius: "20px",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
            {/* Icon */}
            <div style={{
              width: "52px", height: "52px", borderRadius: "16px", flexShrink: 0,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              border: "1px solid rgba(37,99,235,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(37,99,235,0.35)",
            }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 2 L22 6 V14 C22 19 17.8 23.5 13 25 C8.2 23.5 4 19 4 14 V6 L13 2Z"
                  fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="13" cy="11" r="3" fill="white" opacity="0.95" />
                <path d="M8 21 C8 17.7 10.2 15 13 15 C15.8 15 18 17.7 18 21"
                  stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em", marginBottom: "3px" }}>
                Admin
              </div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                System management & analytics
              </div>
            </div>
            {/* Arrow */}
            <div style={{
              width: "32px", height: "32px", borderRadius: "10px",
              background: "rgba(37,99,235,0.18)",
              border: "1px solid rgba(37,99,235,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7H11M8 4l3 3-3 3" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Bottom tag line */}
          <div style={{
            marginTop: "12px", paddingTop: "12px",
            borderTop: "1px solid rgba(37,99,235,0.15)",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#60a5fa", boxShadow: "0 0 6px #60a5fa" }} />
            <span style={{ fontSize: "0.67rem", color: "rgba(96,165,250,0.8)", fontWeight: "600", letterSpacing: "0.05em" }}>
              ADMIN ACCESS ONLY
            </span>
          </div>
        </div>
      </div>

      {/* ════════ FOOTER ════════ */}
      <div style={{
        padding: "0 24px 28px",
        textAlign: "center", zIndex: 1, flexShrink: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease 0.35s",
      }}>
        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
          AI-Powered · Fabric Quality Assurance System · v2.0
        </div>
      </div>
    </div>
  );
}

export default RoleSelect;
