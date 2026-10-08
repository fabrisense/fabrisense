import React, { useState } from 'react';
import onboarding1 from '../assets/onboarding_1.jpg';
import onboarding2 from '../assets/onboarding_2.jpg';
import onboarding3 from '../assets/onboarding_3.jpg';

export function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const slides = [
    {
      image: onboarding1,
      title: 'Inspect Fabric Easily',
      description: 'Capture or upload a fabric image and let FabriSense analyze it in seconds.',
    },
    {
      image: onboarding2,
      title: 'Detect Defects Automatically',
      description: 'Identify common fabric defects like holes, stains, or dropped stitches, and see exactly where they occur.',
    },
    {
      image: onboarding3,
      title: 'Understand Your Quality',
      description: 'Get an easy-to-understand quality grade and a comprehensive digital report to share with buyers.',
    },
  ];

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (onComplete) onComplete();
    }
  };

  const handleSkip = () => {
    if (onComplete) onComplete();
  };

  const slide = slides[currentStep];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-deep)',
        color: 'var(--text-main)',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Mobile Screen Container Frame */}
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 24px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >

        {/* Header Bar: Logo & Skip Button */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          {/* Logo Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '20px',
                backgroundColor: 'var(--accent-green)',
                borderRadius: '3px',
                boxShadow: '0 0 10px var(--accent-green-glow)',
              }}
            />
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
              FabriSense
            </span>
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1.5px solid var(--accent-green)',
              backgroundColor: 'var(--accent-green-soft)',
              color: 'var(--text-green)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-green-glow)',
            }}
          >
            Skip
          </button>
        </div>

        {/* Hero Image Card */}
        <div
          style={{
            width: '100%',
            height: '270px',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            marginBottom: '24px',
            flexShrink: 0,
          }}
        >
          <img
            src={slide.image}
            alt={slide.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>

        {/* Content Section: Title & Description */}
        <div style={{ textAlign: 'left', marginBottom: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--text-heading)',
              lineHeight: 1.2,
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {slide.title}
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              fontWeight: '500',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {slide.description}
          </p>
        </div>

        {/* Bottom Actions Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Pagination Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: idx === currentStep ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentStep ? 'var(--accent-green)' : 'var(--border-subtle)',
                  boxShadow: idx === currentStep ? '0 0 12px var(--accent-green-glow)' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Action Button: Next Step or Get Started */}
          <button
            onClick={handleNext}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'var(--accent-green-gradient)',
              color: 'var(--btn-text)',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-green-glow)',
              transition: 'all 0.25s ease',
            }}
          >
            {currentStep === 2 ? 'Get Started' : 'Next Step'}
          </button>

        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
