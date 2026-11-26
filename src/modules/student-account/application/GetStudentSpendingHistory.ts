import { Clock } from '../../../shared/clock';
import { DomainError } from '../../../shared/domain-error';
import { AuthorizeParentStudentAccess } from './AuthorizeParentStudentAccess';
import {
  SpendingHistoryPeriod,
  StudentSpendingHistoryGateway,
  StudentSpendingHistoryResult,
} from './ports';

export interface GetStudentSpendingHistoryCommand {
  readonly parent: { readonly id: string } | null;
  readonly studentId: number;
  readonly period?: string;
  readonly date?: string;
}

const BANGKOK_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatBangkokToday(now: Date): string {
  return BANGKOK_DATE_FORMATTER.format(now); // YYYY-MM-DD
}

function isValidDayString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function resolvePeriodAndDate(
  periodRaw: string | undefined,
  dateRaw: string | undefined,
  now: Date,
): { period: SpendingHistoryPeriod; targetDate: string } {
  const normalizedPeriod = (periodRaw ?? 'day').trim().toLowerCase();
  if (
    normalizedPeriod !== 'day' &&
    normalizedPeriod !== 'month' &&
    normalizedPeriod !== 'year'
  ) {
    throw new DomainError(
      'INVALID_REQUEST',
      'Period must be one of day, month, or year.',
    );
  }

  const period: SpendingHistoryPeriod = normalizedPeriod;
  const bangkokToday = formatBangkokToday(now);
  const trimmedDate = dateRaw?.trim();

  if (!trimmedDate) {
    if (period === 'day') return { period, targetDate: bangkokToday };
    if (period === 'month') return { period, targetDate: bangkokToday.slice(0, 7) };
    return { period, targetDate: bangkokToday.slice(0, 4) };
  }

  if (period === 'day' && !isValidDayString(trimmedDate)) {
    throw new DomainError(
      'INVALID_REQUEST',
      'Date must be a valid YYYY-MM-DD date for daily period.',
    );
  }

  if (period === 'month') {
    if (!/^\d{4}-\d{2}$/.test(trimmedDate)) {
      throw new DomainError(
        'INVALID_REQUEST',
        'Date must be in YYYY-MM format for monthly period.',
      );
    }
    const monthNum = Number(trimmedDate.slice(5, 7));
    if (monthNum < 1 || monthNum > 12) {
      throw new DomainError('INVALID_REQUEST', 'Month must be between 01 and 12.');
    }
  }

  if (period === 'year' && !/^\d{4}$/.test(trimmedDate)) {
    throw new DomainError(
      'INVALID_REQUEST',
      'Date must be in YYYY format for yearly period.',
    );
  }

  return { period, targetDate: trimmedDate };
}

export class GetStudentSpendingHistory {
  constructor(
    private readonly authorizeParent: AuthorizeParentStudentAccess,
    private readonly historyGateway: StudentSpendingHistoryGateway,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: GetStudentSpendingHistoryCommand,
  ): Promise<StudentSpendingHistoryResult> {
    await this.authorizeParent.execute({
      parent: command.parent,
      studentId: String(command.studentId),
    });

    const { period, targetDate } = resolvePeriodAndDate(
      command.period,
      command.date,
      this.clock.now(),
    );

    return this.historyGateway.getSpendingHistory(
      command.studentId,
      period,
      targetDate,
    );
  }
}
