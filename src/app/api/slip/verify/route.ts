import { handlePromptPaySlip } from '@/lib/promptpay-slip-handler';

export function POST(request: Request) {
  return handlePromptPaySlip(request, 'course');
}
