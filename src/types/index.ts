export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  budgetLimit?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO String
  categoryId: string;
  description: string;
  isRecurring: boolean;
  recurringId?: string;
  isProjected?: boolean;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  frequency: Frequency;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  active: boolean;
}
