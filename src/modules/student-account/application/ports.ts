import { Clock } from '../../../shared/clock';

export interface CardIdGenerator {
  next(): Promise<number>;
}

export type { Clock };
