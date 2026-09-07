import React, { useState, useRef, useEffect } from 'react';
import { Phone, ChevronDown, Search, CheckCircle2 } from 'lucide-react';

const COUNTRIES = [
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'JP', dial: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'FR', dial: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'BR', dial: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
];

export function PhoneInput({ country, setCountry, phone, setPhone, error, setError }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneChange = (e) => {
    // Only allow numbers and spaces/hyphens
    const rawVal = e.target.value.replace(/[^\d\s-]/g, '');
    setPhone(rawVal);
    if (error) setError('');
  };

  return (
    <div className="input-group" style={{ position: 'relative' }}>
      <div className="input-label">
        <span>Phone Number</span>
        {phone.length >= 7 && (
          <span className="label-badge" style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Format Valid
          </span>
        )}
      </div>

      <div className={`input-wrapper ${error ? 'error' : ''}`}>
        {/* Country Selector Dropdown Trigger */}
        <div
          ref={dropdownRef}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={countryTriggerStyle}
          title="Select Country Dial Code"
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ff6b81' }}>
            {selectedCountry.dial}
          </span>
          <ChevronDown size={14} color="#94a3b8" />

          {/* Country Dropdown Panel */}
          {dropdownOpen && (
            <div style={dropdownPanelStyle} onClick={(e) => e.stopPropagation()}>
              <div style={searchWrapperStyle}>
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={searchInputStyle}
                  autoFocus
                />
              </div>

              <div style={countryListStyle}>
                {filteredCountries.map((c) => (
                  <div
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code);
                      setDropdownOpen(false);
                      setSearch('');
                    }}
                    style={{
                      ...countryItemStyle,
                      background: c.code === country ? 'rgba(255, 46, 76, 0.15)' : 'transparent',
                      borderLeft: c.code === country ? '3px solid #ff2e4c' : '3px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: '0.85rem', color: '#f3f4f8' }}>{c.name}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff4d6d' }}>{c.dial}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ height: '24px', width: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />

        <input
          type="tel"
          className="custom-input"
          placeholder="98765 43210"
          value={phone}
          onChange={handlePhoneChange}
          required
        />
      </div>
    </div>
  );
}

const countryTriggerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '0 12px',
  height: '100%',
  cursor: 'pointer',
  userSelect: 'none',
  position: 'relative',
  background: 'rgba(255, 46, 76, 0.05)',
  borderRight: '1px solid rgba(255, 46, 76, 0.15)',
};

const dropdownPanelStyle = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: 0,
  width: '280px',
  maxHeight: '260px',
  background: '#0d1017',
  border: '1px solid rgba(255, 46, 76, 0.3)',
  borderRadius: '12px',
  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 46, 76, 0.2)',
  zIndex: 50,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const searchWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(18, 22, 32, 0.9)',
};

const searchInputStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#ffffff',
  fontSize: '0.8rem',
};

const countryListStyle = {
  overflowY: 'auto',
  flex: 1,
  padding: '4px 0',
};

const countryItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
};
