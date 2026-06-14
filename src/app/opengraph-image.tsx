import { ImageResponse } from 'next/og';

// File-based Open Graph card. Next maps this to twitter:image automatically.
export const alt = 'Scout — Agentic Research Assistant';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0c0a14',
          position: 'relative',
        }}
      >
        {/* Subtle violet/fuchsia gradient glows */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -150,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217,70,239,0.28) 0%, transparent 70%)',
          }}
        />

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
              borderRadius: 22,
              color: '#ffffff',
              fontSize: 64,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: -2,
            }}
          >
            Scout
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 44,
            fontWeight: 600,
            color: '#e9d5ff',
          }}
        >
          Agentic Research Assistant
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: '#a78bb8',
            maxWidth: 900,
          }}
        >
          Watch an AI plan, search the web, and write a cited report — live.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 80,
            fontSize: 22,
            color: '#6b6280',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          Portfolio project
        </div>
      </div>
    ),
    size
  );
}
