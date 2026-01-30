import { describe, it, expect } from 'vitest';
import { calculateTrendData } from './chartUtils';
import type { Transaction } from '../types';

describe('calculateTrendData', () => {
    it('should correctly calculate initial balance excluding future transactions', () => {
        const transactions: Transaction[] = [
            // Past transaction (should be included in initial balance)
            { id: '1', amount: 1000, type: 'income', date: '2023-01-01', accountId: 'acc1', description: 'Past', isRecurring: false },
            // Future transaction (should NOT be included in initial balance or trend)
            { id: '2', amount: 500, type: 'income', date: '2023-03-01', accountId: 'acc1', description: 'Future', isRecurring: false },
        ];

        // View Period: Feb 2023
        const startDate = new Date('2023-02-01T00:00:00.000Z');
        const endDate = new Date('2023-03-01T00:00:00.000Z');

        const data = calculateTrendData(transactions, startDate, endDate, null);

        // Verification:
        // Initial Balance should be 1000 (from Jan transaction).
        // First point (Feb 1st) should be 1000.
        // It should NOT be 1500.

        expect(data.length).toBeGreaterThan(0);
        expect(data[0].balance).toBe(1000);
        
        // Ensure it stays 1000 throughout Feb
        expect(data[data.length - 1].balance).toBe(1000);
    });

    it('should handle transactions within the period correctly', () => {
        const transactions: Transaction[] = [
            { id: '1', amount: 1000, type: 'income', date: '2023-01-01', accountId: 'acc1', description: 'Past', isRecurring: false },
            { id: '3', amount: 100, type: 'expense', date: '2023-02-15', accountId: 'acc1', description: 'Feb Expense', isRecurring: false },
        ];

        const startDate = new Date('2023-02-01T00:00:00.000Z');
        const endDate = new Date('2023-03-01T00:00:00.000Z');

        const data = calculateTrendData(transactions, startDate, endDate, null);

        // Feb 1 (Start): 1000
        expect(data[0].balance).toBe(1000);

        // Feb 15: Should drop to 900
        // Find index for Feb 15. 
        // 0 = Feb 1, 14 = Feb 15
        expect(data[14].balance).toBe(900);
        expect(data[data.length - 1].balance).toBe(900);
    });
});
