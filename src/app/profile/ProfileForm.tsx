'use client';

import { useState } from 'react';
import { FormButton, FormInput } from '@/components/ui/FormControls';
import { learnerAccountStyles as styles } from '@/components/account/learner-account-styles';

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export default function ProfileForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'อัปเดตโปรไฟล์สำเร็จ' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.formGrid} onSubmit={handleSubmit}>
      {message && (
        <p
          className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="profile-name">ชื่อ</label>
        <FormInput
          surface="workspace"
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ชื่อของคุณ"
          autoComplete="name"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-email">อีเมล</label>
        <FormInput surface="workspace" id="profile-email" type="email" value={user.email} disabled />
        <p className={styles.fieldHint}>อีเมลเป็นข้อมูลประจำบัญชีและไม่สามารถเปลี่ยนจากหน้านี้ได้</p>
      </div>

      <div className={styles.formActions}>
        <FormButton surface="workspace" type="submit" pending={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </FormButton>
      </div>
    </form>
  );
}
