'use client';

import { useState } from 'react';
import styles from '@/components/account/LearnerAccount.module.css';

interface PasswordStrength {
  score: number;
  label: string;
  tone: 'weak' | 'medium' | 'strong';
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'อ่อน', tone: 'weak' };
  if (score <= 4) return { score, label: 'ปานกลาง', tone: 'medium' };
  return { score, label: 'แข็งแรง', tone: 'strong' };
}

export default function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isDisabled = loading || !currentPassword || !newPassword || !confirmPassword || !passwordsMatch;
  const strengthClass = strength.tone === 'strong'
    ? styles.strengthStrong
    : strength.tone === 'medium' ? styles.strengthMedium : styles.strengthWeak;

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!passwordsMatch) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        resetForm();
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 3000);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  if (!hasPassword) {
    return (
      <div className={styles.oauthRow}>
        <span className={styles.settingCopy}>
          <strong>รหัสผ่าน</strong>
          <span>บัญชีนี้ใช้ Google เข้าสู่ระบบ จึงไม่ต้องตั้งรหัสผ่านแยก</span>
        </span>
        <span className={styles.oauthBadge}>GOOGLE LOGIN</span>
      </div>
    );
  }

  return (
    <div>
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={isOpen}
        aria-controls="change-password-panel"
        onClick={() => {
          setIsOpen((open) => !open);
          if (isOpen) resetForm();
        }}
      >
        <span className={styles.settingCopy}>
          <strong>เปลี่ยนรหัสผ่าน</strong>
          <span>ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่</span>
        </span>
        <span className={styles.settingMarker} aria-hidden="true">{isOpen ? 'CLOSE −' : 'OPEN +'}</span>
      </button>

      {isOpen && (
        <div className={styles.passwordPanel} id="change-password-panel">
          {success ? (
            <p className={`${styles.message} ${styles.messageSuccess}`} role="status">
              เปลี่ยนรหัสผ่านสำเร็จ คุณสามารถใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป
            </p>
          ) : (
            <form className={styles.formGrid} onSubmit={handleSubmit}>
              {error && <p className={`${styles.message} ${styles.messageError}`} role="alert">{error}</p>}

              <div className={styles.field}>
                <label htmlFor="current-password">รหัสผ่านปัจจุบัน</label>
                <div className={styles.passwordField}>
                  <input
                    className={styles.input}
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label={showCurrentPassword ? 'ซ่อนรหัสผ่านปัจจุบัน' : 'แสดงรหัสผ่านปัจจุบัน'}
                    aria-pressed={showCurrentPassword}
                    onClick={() => setShowCurrentPassword((show) => !show)}
                  >
                    {showCurrentPassword ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="new-password">รหัสผ่านใหม่</label>
                <div className={styles.passwordField}>
                  <input
                    className={styles.input}
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    aria-describedby={newPassword ? 'password-strength' : undefined}
                  />
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label={showNewPassword ? 'ซ่อนรหัสผ่านใหม่' : 'แสดงรหัสผ่านใหม่'}
                    aria-pressed={showNewPassword}
                    onClick={() => setShowNewPassword((show) => !show)}
                  >
                    {showNewPassword ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
                {newPassword && (
                  <div className={styles.strength} id="password-strength">
                    <div className={styles.strengthBars} aria-hidden="true">
                      {[1, 2, 3, 4, 5, 6].map((score) => (
                        <span key={score} data-active={score <= strength.score ? strength.tone : undefined} />
                      ))}
                    </div>
                    <span className={`${styles.strengthLabel} ${strengthClass}`}>ความแข็งแรง: {strength.label}</span>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label>
                <input
                  className={`${styles.input} ${confirmPassword && !passwordsMatch ? styles.inputInvalid : ''}`}
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  autoComplete="new-password"
                  aria-invalid={Boolean(confirmPassword && !passwordsMatch)}
                  aria-describedby={confirmPassword && !passwordsMatch ? 'password-match-error' : undefined}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className={`${styles.fieldHint} ${styles.strengthWeak}`} id="password-match-error">รหัสผ่านไม่ตรงกัน</p>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  className={styles.secondaryAction}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  ยกเลิก
                </button>
                <button className={styles.primaryAction} type="submit" disabled={isDisabled}>
                  {loading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
