'use client';

import { ArrowDown, ArrowUp, ListChecks, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPendingLabel,
  AdminSection,
} from '@/components/admin/ui/AdminOperations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/Toast';
import { QUIZ_LIMITS, lessonQuizInputSchema, type QuizQuestion } from '@/lib/learning/lesson-quiz';

// Draft keys are client-only; ids are sent back so saved questions keep their identity.
type DraftOption = { key: string; id?: string; text: string; isCorrect: boolean };
type DraftQuestion = { key: string; id?: string; prompt: string; options: DraftOption[]; explanation: string };

let draftKey = 0;
const nextKey = () => `draft-${draftKey++}`;
const emptyOption = (isCorrect = false): DraftOption => ({ key: nextKey(), text: '', isCorrect });
const emptyQuestion = (): DraftQuestion => ({
  key: nextKey(),
  prompt: '',
  options: [emptyOption(true), emptyOption(), emptyOption()],
  explanation: '',
});

function toDraft(questions: QuizQuestion[]): DraftQuestion[] {
  return questions.map((question) => ({
    key: nextKey(),
    id: question.id,
    prompt: question.prompt,
    explanation: question.explanation ?? '',
    options: question.options.map((option) => ({ key: nextKey(), ...option })),
  }));
}

export function toQuizPayload(drafts: DraftQuestion[]) {
  return {
    questions: drafts.map((question) => ({
      ...(question.id ? { id: question.id } : {}),
      prompt: question.prompt,
      explanation: question.explanation.trim() || null,
      options: question.options.map((option) => ({
        ...(option.id ? { id: option.id } : {}),
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}

export default function LessonQuizEditor({ lessonId }: { lessonId: string }) {
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/quiz`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'โหลดแบบทดสอบไม่สำเร็จ');
      setQuestions(toDraft(data.questions ?? []));
      setDirty(false);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : 'โหลดแบบทดสอบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const update = (next: (current: DraftQuestion[]) => DraftQuestion[]) => {
    setQuestions(next);
    setDirty(true);
    setSaveError('');
  };
  const updateQuestion = (key: string, change: (question: DraftQuestion) => DraftQuestion) => {
    update((current) => current.map((question) => (question.key === key ? change(question) : question)));
  };
  const moveQuestion = (index: number, direction: -1 | 1) => {
    update((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  };

  const save = async () => {
    const payload = toQuizPayload(questions);
    const validation = lessonQuizInputSchema.safeParse(payload);
    if (!validation.success) {
      setSaveError(validation.error.issues[0]?.message ?? 'กรุณาตรวจสอบแบบทดสอบ');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/quiz`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'บันทึกแบบทดสอบไม่สำเร็จ');
      setQuestions(toDraft(data.questions ?? []));
      setDirty(false);
      showToast('บันทึกแบบทดสอบแล้ว', 'success');
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : 'บันทึกแบบทดสอบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const description = 'คำถามปรนัยหลังจบบทเรียน ผู้เรียนทำซ้ำได้และเห็นคำอธิบายหลังส่ง ไม่มีผลกับการเรียนจบหรือใบรับรอง';

  if (loading) return <AdminSection title="แบบทดสอบท้ายบท" description={description}><AdminLoadingState title="กำลังโหลดแบบทดสอบ" /></AdminSection>;
  if (loadError) {
    return (
      <AdminSection title="แบบทดสอบท้ายบท" description={description}>
        <AdminErrorState description={loadError} action={<Button variant="outline" onClick={() => void load()}>ลองใหม่</Button>} />
      </AdminSection>
    );
  }

  return (
    <AdminSection title="แบบทดสอบท้ายบท" description={description}>
      <div className="flex flex-col gap-5">
        {questions.length === 0 ? (
          <AdminEmptyState
            icon={<ListChecks aria-hidden />}
            title="ยังไม่มีแบบทดสอบ"
            description="เพิ่มคำถามสั้น ๆ 3–5 ข้อ เพื่อให้ผู้เรียนเช็กความเข้าใจก่อนไปบทถัดไป"
          />
        ) : null}

        {questions.map((question, index) => {
          const correctKey = question.options.find((option) => option.isCorrect)?.key;
          return (
            <FieldSet key={question.key} className="gap-4 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLegend className="mb-0">คำถามที่ {index + 1}</FieldLegend>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`ย้ายคำถามที่ ${index + 1} ขึ้น`} disabled={index === 0} onClick={() => moveQuestion(index, -1)}><ArrowUp aria-hidden /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`ย้ายคำถามที่ ${index + 1} ลง`} disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)}><ArrowDown aria-hidden /></Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => update((current) => current.filter((item) => item.key !== question.key))}>
                    <Trash2 data-icon="inline-start" aria-hidden />ลบคำถาม
                  </Button>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor={`${question.key}-prompt`}>คำถาม *</FieldLabel>
                <Textarea
                  id={`${question.key}-prompt`}
                  value={question.prompt}
                  maxLength={QUIZ_LIMITS.prompt}
                  rows={2}
                  onChange={(event) => updateQuestion(question.key, (current) => ({ ...current, prompt: event.target.value }))}
                  placeholder="เช่น useEffect ทำงานเมื่อไร"
                />
              </Field>

              <FieldSet className="gap-2">
                <FieldLegend variant="label">ตัวเลือก (เลือกคำตอบที่ถูก 1 ข้อ)</FieldLegend>
                {question.options.map((option, optionIndex) => (
                  <div key={option.key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${question.key}-correct`}
                      aria-label={`ตัวเลือกที่ ${optionIndex + 1} เป็นคำตอบที่ถูก`}
                      checked={option.key === correctKey}
                      onChange={() => updateQuestion(question.key, (current) => ({
                        ...current,
                        options: current.options.map((item) => ({ ...item, isCorrect: item.key === option.key })),
                      }))}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <Input
                      aria-label={`ตัวเลือกที่ ${optionIndex + 1} ของคำถามที่ ${index + 1}`}
                      value={option.text}
                      maxLength={QUIZ_LIMITS.option}
                      onChange={(event) => updateQuestion(question.key, (current) => ({
                        ...current,
                        options: current.options.map((item) => (item.key === option.key ? { ...item, text: event.target.value } : item)),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ลบตัวเลือกที่ ${optionIndex + 1}`}
                      disabled={question.options.length <= QUIZ_LIMITS.minOptions}
                      onClick={() => updateQuestion(question.key, (current) => {
                        const options = current.options.filter((item) => item.key !== option.key);
                        // Keep exactly one correct answer when the correct option is removed.
                        return { ...current, options: options.some((item) => item.isCorrect) ? options : options.map((item, i) => ({ ...item, isCorrect: i === 0 })) };
                      })}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                ))}
                {question.options.length < QUIZ_LIMITS.maxOptions ? (
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => updateQuestion(question.key, (current) => ({ ...current, options: [...current.options, emptyOption()] }))}>
                    <Plus data-icon="inline-start" aria-hidden />เพิ่มตัวเลือก
                  </Button>
                ) : null}
              </FieldSet>

              <Field>
                <FieldLabel htmlFor={`${question.key}-explanation`}>คำอธิบายหลังส่งคำตอบ</FieldLabel>
                <Textarea
                  id={`${question.key}-explanation`}
                  value={question.explanation}
                  maxLength={QUIZ_LIMITS.explanation}
                  rows={2}
                  onChange={(event) => updateQuestion(question.key, (current) => ({ ...current, explanation: event.target.value }))}
                  placeholder="อธิบายว่าทำไมคำตอบนี้ถูก หรือชี้กลับไปที่ช่วงในวิดีโอ"
                />
                <FieldDescription>ไม่บังคับ แต่ช่วยให้ผู้เรียนเข้าใจจุดที่ตอบผิด</FieldDescription>
              </Field>
            </FieldSet>
          );
        })}

        {saveError ? (
          <Alert variant="destructive">
            <AlertTitle>บันทึกแบบทดสอบไม่สำเร็จ</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={questions.length >= QUIZ_LIMITS.questions} onClick={() => update((current) => [...current, emptyQuestion()])}>
            <Plus data-icon="inline-start" aria-hidden />เพิ่มคำถาม
          </Button>
          <div className="flex items-center gap-3">
            {dirty ? <span className="text-sm text-muted-foreground">ยังไม่ได้บันทึกแบบทดสอบ</span> : null}
            <Button type="button" disabled={saving || !dirty} onClick={() => void save()}>
              {saving ? <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel> : <><Save data-icon="inline-start" aria-hidden />บันทึกแบบทดสอบ</>}
            </Button>
          </div>
        </div>
      </div>
    </AdminSection>
  );
}
