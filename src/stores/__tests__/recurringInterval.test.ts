import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBudgetStore } from '../useBudgetStore';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({ data: [] }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }), // Fix chaining
      delete: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('Recurring Transactions Interval', () => {
    beforeEach(() => {
        useBudgetStore.setState({
            transactions: [],
            recurringTransactions: [],
            accounts: [{ id: 'acc1', name: 'Test Account', type: 'checking' }],
            selectedAccountId: 'acc1'
        });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should generate transactions respecting the interval (e.g. every 2 months)', () => {
        const { addRecurringTransaction, checkRecurringTransactions } = useBudgetStore.getState();
        
        // Set Today to 2024-06-01
        const today = new Date('2024-06-01');
        vi.setSystemTime(today);

        // Create initial rule starting Jan 1st, every 2 months
        // Expected: Jan 1, Mar 1, May 1. (July 1 is future relative to June 1)
        addRecurringTransaction({
            id: 'rec_interval',
            amount: 100,
            type: 'expense',
            description: 'Bi-monthly Service',
            frequency: 'monthly',
            interval: 2,
            startDate: '2024-01-01',
            nextDueDate: '2024-01-01',
            accountId: 'acc1',
            active: true
        });

        checkRecurringTransactions();

        const { transactions } = useBudgetStore.getState();
        
        // Sort by date to be sure
        const sorted = transactions.sort((a, b) => a.date.localeCompare(b.date));
        
        expect(sorted).toHaveLength(3);
        expect(sorted[0].date).toBe('2024-01-01');
        expect(sorted[1].date).toBe('2024-03-01');
        expect(sorted[2].date).toBe('2024-05-01');
    });

    it('should generate transactions respecting weekly interval (e.g. every 2 weeks)', () => {
        const { addRecurringTransaction, checkRecurringTransactions } = useBudgetStore.getState();
        
        // Set Today to 2024-02-01
        const today = new Date('2024-02-01');
        vi.setSystemTime(today);

        // Start Jan 1st. 
        // 1: Jan 1
        // 2: Jan 15 (+14 days)
        // 3: Jan 29 (+14 days)
        // 4: Feb 12 (Future)
        addRecurringTransaction({
            id: 'rec_weekly',
            amount: 50,
            type: 'expense',
            description: 'Bi-weekly',
            frequency: 'weekly',
            interval: 2,
            startDate: '2024-01-01',
            nextDueDate: '2024-01-01',
            accountId: 'acc1',
            active: true
        });

        checkRecurringTransactions();

        const { transactions } = useBudgetStore.getState();
        const sorted = transactions.sort((a, b) => a.date.localeCompare(b.date));

        expect(sorted).toHaveLength(3);
        expect(sorted[0].date).toBe('2024-01-01');
        expect(sorted[1].date).toBe('2024-01-15');
        expect(sorted[2].date).toBe('2024-01-29');
    });
});
