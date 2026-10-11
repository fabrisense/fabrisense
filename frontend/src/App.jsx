import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MobileApp } from './components/MobileApp';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Mobile Application (Main entry point) ── */}
        <Route path="/" element={<MobileApp />} />
        <Route path="/mobile/*" element={<MobileApp />} />
        {/* Redirect any other URL back to the app */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
