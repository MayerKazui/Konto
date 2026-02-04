export type CategoryId = 
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'insurance'
  | 'healthcare'
  | 'savings'
  | 'personal'
  | 'entertainment'
  | 'education'
  | 'income'
  | 'transfer'
  | 'other';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string; // Emoji for simplicity
  color: string; // Tailwind color class or hex
}

export const CATEGORIES: Category[] = [
  { id: 'housing', label: 'Logement', icon: '🏠', color: 'bg-blue-100 text-blue-600' },
  { id: 'food', label: 'Alimentation', icon: '🍔', color: 'bg-orange-100 text-orange-600' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: 'bg-slate-100 text-slate-600' },
  { id: 'utilities', label: 'Factures', icon: '💡', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'insurance', label: 'Assurance', icon: '🛡️', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'healthcare', label: 'Santé', icon: '🩺', color: 'bg-red-100 text-red-600' },
  { id: 'savings', label: 'Épargne', icon: '💰', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'personal', label: 'Personnel', icon: '🛍️', color: 'bg-pink-100 text-pink-600' },
  { id: 'entertainment', label: 'Loisirs', icon: '🎉', color: 'bg-purple-100 text-purple-600' },
  { id: 'education', label: 'Éducation', icon: '📚', color: 'bg-cyan-100 text-cyan-600' },
  { id: 'other', label: 'Autre', icon: '📦', color: 'bg-gray-100 text-gray-600' },
];

export const getCategory = (id?: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other')!;
