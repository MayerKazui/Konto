import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBudgetStore } from '../useBudgetStore';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('useBudgetStore Savings Goals', () => {
  beforeEach(() => {
    useBudgetStore.setState({
      savingsGoals: [],
      isSyncing: false,
      notification: null
    });
    vi.clearAllMocks();
  });

  it('adds a savings goal correctly', async () => {
    const goal = {
      id: '1',
      name: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 0,
      color: 'bg-red-500'
    };

    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user1' } } });

    await useBudgetStore.getState().addSavingsGoal(goal);

    const state = useBudgetStore.getState();
    expect(state.savingsGoals).toHaveLength(1);
    expect(state.savingsGoals[0]).toEqual(goal);
    expect(supabase.from).toHaveBeenCalledWith('savings_goals');
  });

  it('updates a savings goal correctly', async () => {
    const goal = {
      id: '1',
      name: 'Old Name',
      targetAmount: 1000,
      currentAmount: 0,
      color: 'bg-red-500'
    };
    useBudgetStore.setState({ savingsGoals: [goal] });

    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user1' } } });

    await useBudgetStore.getState().updateSavingsGoal('1', { name: 'New Name' });

    const state = useBudgetStore.getState();
    expect(state.savingsGoals[0].name).toBe('New Name');
  });

  it('deletes a savings goal correctly', async () => {
     const goal = {
      id: '1',
      name: 'To Delete',
      targetAmount: 100,
      currentAmount: 0,
      color: 'bg-red-500'
    };
    useBudgetStore.setState({ savingsGoals: [goal] });
    
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user1' } } });

    await useBudgetStore.getState().deleteSavingsGoal('1');

    const state = useBudgetStore.getState();
    expect(state.savingsGoals).toHaveLength(0);
  });
});
