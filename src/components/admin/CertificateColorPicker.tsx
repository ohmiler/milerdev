'use client';

import { useState } from 'react';

const PRESET_COLORS = [
  { color: '#2563eb', label: 'น้ำเงิน' },
  { color: '#7c3aed', label: 'ม่วง' },
  { color: '#059669', label: 'เขียว' },
  { color: '#dc2626', label: 'แดง' },
  { color: '#d97706', label: 'ส้มทอง' },
  { color: '#0891b2', label: 'ฟ้าอมเขียว' },
  { color: '#be185d', label: 'ชมพู' },
  { color: '#4f46e5', label: 'คราม' },
  { color: '#475569', label: 'เทาเข้ม' },
  { color: '#b45309', label: 'ทองคำ' },
];

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export default function CertificateColorPicker({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const displayColor = value || '#2563eb';

  return (
    <div>
      {/* Main color display + picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowPicker(!showPicker)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: displayColor,
              cursor: 'pointer',
              border: '3px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          {showPicker && (
            <div style={{
              position: 'absolute',
              top: '56px',
              left: 0,
              zIndex: 100,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              padding: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <input
                type="color"
                value={displayColor}
                onChange={(e) => onChange(e.target.value)}
                style={{
                  width: '200px',
                  height: '150px',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  padding: 0,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                ตกลง
              </button>
            </div>
          )}
        </div>
        <input
          type="text"
          value={displayColor}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          placeholder="#2563eb"
          style={{
            width: '100px',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.9375rem',
          }}
        />
        <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>คลิกสีเพื่อเปิด color picker หรือพิมพ์ hex code</span>
      </div>

      {/* Preset swatches */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {PRESET_COLORS.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={label}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: color,
              border: value === color ? '3px solid #1e293b' : '2px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              transform: value === color ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      <p style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#64748b' }}>
        เลือกสีด่วนจากด้านบน หรือกำหนดสีเองได้อิสระ — สีนี้จะใช้เป็นธีมใบรับรองของคอร์สนี้
      </p>
    </div>
  );
}
