import React, { useState } from 'react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { Target, Plus, Pencil, Trash2, X, Check, PiggyBank } from 'lucide-react';
import type { SavingsGoal } from '@/types';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const SavingsGoals = () => {
    const { savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, notify } = useBudgetStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [color, setColor] = useState('bg-indigo-500');

    const presetColors = [
        'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500',
        'bg-amber-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500'
    ];

    const resetForm = () => {
        setName('');
        setTargetAmount('');
        setCurrentAmount('');
        setDeadline('');
        setColor('bg-indigo-500');
        setIsAdding(false);
        setEditingId(null);
    };

    const startEdit = (goal: SavingsGoal) => {
        setName(goal.name);
        setTargetAmount(goal.targetAmount.toString());
        setCurrentAmount(goal.currentAmount.toString());
        setDeadline(goal.deadline || '');
        setColor(goal.color);
        setEditingId(goal.id);
        setIsAdding(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) return;

        const goalData: SavingsGoal = {
            id: editingId || crypto.randomUUID(),
            name,
            targetAmount: parseFloat(targetAmount),
            currentAmount: parseFloat(currentAmount) || 0,
            deadline: deadline || undefined,
            color
        };

        if (editingId) {
            updateSavingsGoal(editingId, goalData);
            notify("Objectif mis à jour", "success");
        } else {
            addSavingsGoal(goalData);
            notify("Nouvel objectif créé", "success");
        }
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (confirm('Supprimer cet objectif ?')) {
            deleteSavingsGoal(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                    <PiggyBank className="w-5 h-5 mr-2 text-indigo-500" />
                    Objectifs d'Épargne
                </h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    data-testid="add-goal-header-btn"
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                >
                    {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" placeholder="Ex: Voyage Japon" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Cible (€)</label>
                            <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" placeholder="1000" step="0.01" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Actuel (€)</label>
                            <input type="number" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" placeholder="0" step="0.01" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Date limite (Optionnel)</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Couleur</label>
                        <div className="flex gap-2">
                            {presetColors.map(c => (
                                <button key={c} type="button" onClick={() => setColor(c)} className={clsx("w-6 h-6 rounded-full transition-transform hover:scale-110", c, color === c && "ring-2 ring-offset-2 ring-slate-400")} />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={resetForm} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Annuler</button>
                        <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
                            <Check className="w-4 h-4 mr-2" /> {editingId ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savingsGoals.map(goal => {
                    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                    return (
                        <div key={goal.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button onClick={() => startEdit(goal)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Pencil className="w-3 h-3 text-slate-400" /></button>
                                <button onClick={() => handleDelete(goal.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Trash2 className="w-3 h-3 text-rose-400" /></button>
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm", goal.color)}>
                                    {progress.toFixed(0)}%
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{goal.name}</h3>
                                    <p className="text-xs text-slate-500">
                                        {goal.deadline ? `Objectif : ${format(new Date(goal.deadline), 'd MMM yyyy', { locale: fr })}` : 'Pas de date limite'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{goal.currentAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                                    <span className="text-slate-400">/ {goal.targetAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={clsx("h-full transition-all duration-500", goal.color)} style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {savingsGoals.length === 0 && !isAdding && (
                    <div onClick={() => setIsAdding(true)} className="col-span-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors">
                        <Target className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Créer un objectif d'épargne</p>
                    </div>
                )}
            </div>
        </div>
    );
};
