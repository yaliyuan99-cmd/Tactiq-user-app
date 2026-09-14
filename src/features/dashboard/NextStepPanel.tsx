import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { ButtonLink, Card } from '@/components';
import { cn } from '@/lib/cn';
import { PRACTISE_LABEL, showsPractiseLink, type NextAction } from './nextAction';

export interface NextStepPanelProps {
  readonly action: NextAction;
  readonly className?: string;
}

/** "What to do next": one primary action, the reason for it, and a way to practise. */
export function NextStepPanel({ action, className }: NextStepPanelProps) {
  return (
    <Card heading="What to do next" className={cn('border-l-4 border-l-primary', className)} data-next-action={action.id}>
      <p className="max-w-prose text-lg">{action.reason}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ButtonLink to={action.to} size="lg" trailingIcon={<ArrowRight className="h-5 w-5" />} className="text-left">
          {action.label}
        </ButtonLink>
        {showsPractiseLink(action) && (
          <ButtonLink to={ROUTES.simulator} variant="secondary">
            {PRACTISE_LABEL}
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
