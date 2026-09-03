import type { ComponentProps, ReactNode } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CircleSlash2,
  Inbox,
  RotateCcw,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

type NoticeState = 'error' | 'success' | 'pending' | 'verifying' | 'refunded' | 'disabled';

interface LoadingFeedbackStateProps {
  state: 'loading';
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

interface EmptyFeedbackStateProps {
  state: 'empty';
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

interface NoticeFeedbackStateProps {
  state: NoticeState;
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export type FeedbackStateProps =
  | LoadingFeedbackStateProps
  | EmptyFeedbackStateProps
  | NoticeFeedbackStateProps;

const noticeSemantics = {
  error: { variant: 'destructive', role: 'alert', live: 'assertive' },
  success: { variant: 'success', role: 'status', live: 'polite' },
  pending: { variant: 'info', role: 'status', live: 'polite' },
  verifying: { variant: 'info', role: 'status', live: 'polite' },
  refunded: { variant: 'warning', role: 'status', live: 'polite' },
  disabled: { variant: 'default', role: 'status', live: 'polite' },
} as const satisfies Record<NoticeState, {
  variant: 'default' | 'info' | 'warning' | 'success' | 'destructive';
  role: 'alert' | 'status';
  live: 'assertive' | 'polite';
}>;

const noticeIcons: Record<NoticeState, ReactNode> = {
  error: <CircleAlert aria-hidden={true} />,
  success: <CircleCheck aria-hidden={true} />,
  pending: <Spinner aria-hidden={true} />,
  verifying: <Spinner aria-hidden={true} />,
  refunded: <RotateCcw aria-hidden={true} />,
  disabled: <CircleSlash2 aria-hidden={true} />,
};

export function FeedbackState(props: FeedbackStateProps) {
  if (props.state === 'loading') {
    return (
      <div aria-busy={true} className={props.className} data-feedback-state="loading">
        <span className="sr-only" role="status" aria-live="polite">
          {props.title}
        </span>
        <div aria-hidden={true}>{props.children}</div>
      </div>
    );
  }

  if (props.state === 'empty') {
    return (
      <Empty
        className={props.className}
        data-feedback-state="empty"
        role="status"
        aria-live="polite"
      >
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {props.icon ?? <Inbox aria-hidden={true} />}
          </EmptyMedia>
          <EmptyTitle>{props.title}</EmptyTitle>
          <EmptyDescription>{props.description}</EmptyDescription>
        </EmptyHeader>
        {props.action ? <EmptyContent>{props.action}</EmptyContent> : null}
      </Empty>
    );
  }

  const semantics = noticeSemantics[props.state];
  return (
    <Alert
      className={props.className}
      data-feedback-state={props.state}
      variant={semantics.variant}
      role={semantics.role}
      aria-live={semantics.live}
    >
      {props.icon ?? noticeIcons[props.state]}
      <AlertTitle>{props.title}</AlertTitle>
      <AlertDescription>{props.description}</AlertDescription>
      {props.action ? <div className="col-start-2 mt-2">{props.action}</div> : null}
    </Alert>
  );
}

export interface PendingButtonProps
  extends Omit<ComponentProps<typeof Button>, 'aria-busy' | 'asChild'> {
  pending: boolean;
  pendingLabel?: ReactNode;
}

export function PendingButton({
  pending,
  pendingLabel = 'กำลังดำเนินการ…',
  children,
  disabled,
  className,
  ...buttonProps
}: PendingButtonProps) {
  return (
    <Button
      {...buttonProps}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
    >
      {pending ? <Spinner aria-hidden={true} /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
