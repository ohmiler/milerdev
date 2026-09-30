import { handlePromptPaySlip } from '@/lib/commerce/promptpay-slip-handler';

export function POST(request: Request) {
  return handlePromptPaySlip(request, 'bundle');
}
