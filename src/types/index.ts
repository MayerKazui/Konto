export type TransactionType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'credit';
  includeInTotal?: boolean; // Deprecated, favored for on-the-fly toggling
}

export interface AccountGroup {
  id: string;
  name: string;
  accountIds: string[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO String
  accountId: string;
  description: string;
  isRecurring: boolean;
  recurringId?: string;
  isProjected?: boolean;
  isTransfer?: boolean;
  linkedTransactionId?: string;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  description: string;
  frequency: Frequency;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  active: boolean;
  isTransfer?: boolean;
}
