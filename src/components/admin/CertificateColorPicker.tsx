'use client';

import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  isHtmlCertificateColor,
  normalizeCertificateColor,
} from '@/lib/certificate-color';
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
  const committedColor = normalizeCertificateColor(value);
  const [draftColor, setDraftColor] = useState(committedColor);
  const [showPicker, setShowPicker] = useState(false);
  const draftIsValid = isHtmlCertificateColor(draftColor);

  useEffect(() => {
    setDraftColor(committedColor);
  }, [committedColor]);

  const updateDraft = (nextValue: string) => {
    setDraftColor(nextValue);
    if (isHtmlCertificateColor(nextValue)) onChange(nextValue.toLowerCase());
  };

  const selectColor = (nextValue: string) => {
    const normalized = normalizeCertificateColor(nextValue);
    setDraftColor(normalized);
    onChange(normalized);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          style={{ backgroundColor: committedColor, color: 'var(--primary-foreground)' }}
          onClick={() => setShowPicker(true)}
          aria-label="เปิดตัวเลือกสี"
        >
          <Palette aria-hidden />
        </Button>
        <Field data-invalid={!draftIsValid}>
          <Input
            value={draftColor}
            onChange={(event) => updateDraft(event.target.value)}
            placeholder="#2563eb"
            maxLength={7}
            className="w-32 font-mono"
            aria-label="รหัสสี Hex"
            aria-invalid={!draftIsValid}
          />
          <FieldDescription>
            {draftIsValid
              ? 'คลิกตัวอย่างสีเพื่อเปิด color picker หรือพิมพ์ hex code'
              : 'กรุณาระบุรหัสสีให้ครบในรูปแบบ #RRGGBB'}
          </FieldDescription>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="สีสำเร็จรูป">
        {PRESET_COLORS.map(({ color, label }) => {
          const selected = committedColor === color;
          return (
            <Button
              key={color}
              type="button"
              variant="outline"
              size="icon-sm"
              title={label}
              aria-label={label}
              aria-pressed={selected}
              className={cn(selected && 'ring-2 ring-ring ring-offset-2')}
              style={{ backgroundColor: color }}
              onClick={() => selectColor(color)}
            />
          );
        })}
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
          <div className="my-4 flex flex-col gap-3">
            <Input
              type="color"
              value={committedColor}
              onChange={(event) => selectColor(event.target.value)}
              className="h-44 w-full cursor-pointer p-2"
              aria-label="เลือกสีใบรับรอง"
            />
            <Input value={committedColor} readOnly className="font-mono" aria-label="รหัสสีที่เลือก" />
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
