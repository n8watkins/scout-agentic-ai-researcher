import { ImageResponse } from 'next/og';

// File-based favicon. Mirrors the sidebar brand mark: a violet→fuchsia
// gradient rounded square with a bold white "S".
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
          borderRadius: 7,
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        S
      </div>
    ),
    size
  );
}
