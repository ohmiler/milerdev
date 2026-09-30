'use client';

import { Button } from '@/components/ui/button';
import { openConsentSettings } from '@/components/privacy/consent-client';

export default function ConsentSettingsButton() {
  return <Button type="button" variant="outline" onClick={openConsentSettings}>ตั้งค่าความเป็นส่วนตัว</Button>;
}
