'use client';

import { useState } from 'react';
import { Palette } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0 p-0"
          style={{ backgroundColor: displayColor }}
          onClick={() => setShowPicker(true)}
          aria-label="เปิดตัวเลือกสี"
        >
          <Palette className="size-4 text-white drop-shadow-sm" aria-hidden />
        </Button>
        <Input
          value={displayColor}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(nextValue)) onChange(nextValue);
          }}
          placeholder="#2563eb"
          className="w-32 font-mono"
          aria-label="รหัสสี Hex"
        />
        <p className="text-xs leading-5 text-muted-foreground">คลิกตัวอย่างสีเพื่อเปิด color picker หรือพิมพ์ hex code</p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="สีสำเร็จรูป">
        {PRESET_COLORS.map(({ color, label }) => (
          <Button
            key={color}
            type="button"
            variant="outline"
            size="icon-sm"
            title={label}
            aria-label={label}
            aria-pressed={displayColor.toLowerCase() === color.toLowerCase()}
            className={cn(
              'rounded-lg border-2 p-0',
              displayColor.toLowerCase() === color.toLowerCase() && 'ring-2 ring-ring ring-offset-2',
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        สีนี้จะใช้เป็นธีมใบรับรองของคอร์ส สามารถเลือกสีด่วนหรือกำหนดเองได้
      </p>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>กำหนดสีใบรับรอง</DialogTitle>
            <DialogDescription>เลือกสีจากเครื่องมือของระบบ แล้วตรวจรหัส Hex ก่อนยืนยัน</DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-3">
            <Input
              type="color"
              value={displayColor}
              onChange={(event) => onChange(event.target.value)}
              className="h-44 w-full cursor-pointer p-2"
              aria-label="เลือกสีใบรับรอง"
            />
            <Input value={displayColor} readOnly className="font-mono" aria-label="รหัสสีที่เลือก" />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setShowPicker(false)}>
              ใช้สีนี้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
