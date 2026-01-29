import { describe, it, expect, beforeEach } from 'vitest';
import { useBudgetStore } from '../useBudgetStore';

describe('useBudgetStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useBudgetStore.setState({
            transactions: [],
            accounts: [],
            categories: [
                { id: '1', name: 'Salary', type: 'income', color: '#10b981' },
                { id: '2', name: 'Food', type: 'expense', color: '#f59e0b' },
            ],
            recurringTransactions: [],
            selectedAccountId: null
        });
    });

    it('should add a transaction', () => {
        const transaction = {
            id: '1',
            amount: 50,
            type: 'expense' as const,
            categoryId: '2',
            accountId: 'acc1',
            description: 'Lunch',
            date: '2023-01-01',
            isRecurring: false
        };

        useBudgetStore.getState().addTransaction(transaction);

        const { transactions } = useBudgetStore.getState();
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toEqual(transaction);
    });

    it('should delete a transaction', () => {
        const transaction = {
            id: '1',
            amount: 50,
            type: 'expense' as const,
            categoryId: '2',
            accountId: 'acc1',
            description: 'Lunch',
            date: '2023-01-01',
            isRecurring: false
        };

        useBudgetStore.getState().addTransaction(transaction);
        useBudgetStore.getState().deleteTransaction('1');

        const { transactions } = useBudgetStore.getState();
        expect(transactions).toHaveLength(0);
    });

    it('should calculate balance correctly', () => {
        const income = {
            id: '1',
            amount: 1000,
            type: 'income' as const,
            categoryId: '1',
            accountId: 'acc1',
            description: 'Salary',
            date: '2023-01-01',
            isRecurring: false
        };

        const expense = {
            id: '2',
            amount: 200,
            type: 'expense' as const,
            categoryId: '2',
            accountId: 'acc1',
            description: 'Groceries',
            date: '2023-01-02',
            isRecurring: false
        };

        useBudgetStore.getState().addTransaction(income);
        useBudgetStore.getState().addTransaction(expense);

        // Mock selected account if necessary, or pass accountId to getBalance
        // If no account selected, getBalance sums everything or defaults?
        // Let's test getBalance('acc1')

        const balance = useBudgetStore.getState().getBalance('acc1');
        expect(balance).toBe(800);
    });
});
