import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  User,
  AlertCircle,
  PieChart,
} from 'lucide-react';
import { Member, BazarExpense, BazarCategory, MessSettings } from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../services/calculations';
import { formatDateShort } from '../../utils/dateUtils';

interface BazarViewProps {
  bazar: BazarExpense[];
  members: Member[];
  onSaveBazar: (expense: BazarExpense) => void;
  onDeleteBazar: (id: string) => void;
  selectedMonth: string;
  settings: MessSettings;
  isOpenAddModalDirectly?: boolean;
  onCloseAddModalDirectly?: () => void;
}

const CATEGORIES: BazarCategory[] = [
  'Rice',
  'Vegetable',
  'Fish',
  'Meat',
  'Grocery',
  'Oil',
  'Spices',
  'Gas',
  'Other',
];

export const BazarView: React.FC<BazarViewProps> = ({
  bazar,
  members,
  onSaveBazar,
  onDeleteBazar,
  selectedMonth,
  settings,
  isOpenAddModalDirectly,
  onCloseAddModalDirectly,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BazarExpense | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BazarExpense | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BazarCategory>('Vegetable');
  const [amount, setAmount] = useState<number | ''>('');
  const [paidByMemberId, setPaidByMemberId] = useState<string>('MESS_FUND');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter for the selected month
  const monthBazar = bazar.filter((b) => b.date.startsWith(selectedMonth));

  // Open add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setCategory('Vegetable');
    setAmount('');
    setPaidByMemberId('MESS_FUND');
    setNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (item: BazarExpense) => {
    setEditingItem(item);
    setDate(item.date);
    setDescription(item.description);
    setCategory(item.category);
    setAmount(item.amount);
    setPaidByMemberId(item.paidByMemberId);
    setNote(item.note || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }

    const expense: BazarExpense = {
      id: editingItem ? editingItem.id : `baz-${Date.now()}`,
      date,
      description: description.trim(),
      category,
      amount: numAmount,
      paidByMemberId,
      note: note.trim() || undefined,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    onSaveBazar(expense);
    setIsModalOpen(false);
    if (onCloseAddModalDirectly) onCloseAddModalDirectly();
  };

  // Filtered bazar
  const filtered = monthBazar.filter((b) => {
    const matchesSearch =
      b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.note && b.note.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesPayer = selectedPayer === 'all' || b.paidByMemberId === selectedPayer;

    return matchesSearch && matchesCat && matchesPayer;
  });

  // Calculate totals
  const totalBazarAmount = monthBazar.reduce((a, b) => a + Number(b.amount), 0);
  const filteredAmount = filtered.reduce((a, b) => a + Number(b.amount), 0);

  // Category breakdown
  const categoryTotals: { [cat: string]: number } = {};
  monthBazar.forEach((b) => {
    categoryTotals[b.category] = (categoryTotals[b.category] || 0) + Number(b.amount);
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bazar / Market Expenses</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Log grocery shopping, fish, meat, and vegetables. Automatically feeds into Meal Rate.
          </p>
        </div>

        <button
          id="btn-add-bazar-main"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Bazar Entry</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Month Bazar</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {formatCurrency(totalBazarAmount, settings.currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">{monthBazar.length} market trips recorded</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid from Mess Fund</span>
          <div className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">
            {formatCurrency(
              monthBazar
                .filter((b) => b.paidByMemberId === 'MESS_FUND')
                .reduce((a, b) => a + Number(b.amount), 0),
              settings.currency
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">From collected cash balance</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid by Members</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
            {formatCurrency(
              monthBazar
                .filter((b) => b.paidByMemberId !== 'MESS_FUND')
                .reduce((a, b) => a + Number(b.amount), 0),
              settings.currency
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Credited to their personal ledger</div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryTotals[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{cat}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {formatCurrency(count, settings.currency)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            id="bazar-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description or notes (e.g. Rice, Fish)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Paid By Filter */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <select
            id="bazar-payer-filter"
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Payers</option>
            <option value="MESS_FUND">Mess Fund (Cash)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname || m.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bazar Table / List */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-4">Item Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Paid By</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No bazar records found for this month or filter.
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((item) => {
                    const payer = members.find((m) => m.id === item.paidByMemberId);
                    const payerLabel =
                      item.paidByMemberId === 'MESS_FUND'
                        ? 'Mess Fund (Cash)'
                        : payer?.nickname || payer?.fullName || 'Member';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 text-slate-500 text-xs font-semibold whitespace-nowrap">
                          {formatDateShort(item.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.description}</div>
                          {item.note && <div className="text-xs text-slate-400">{item.note}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/50">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              item.paidByMemberId === 'MESS_FUND' ? 'text-slate-600' : 'text-emerald-700'
                            }`}
                          >
                            {payerLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-slate-900 text-base">
                          {formatCurrency(item.amount, settings.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Bazar Entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen || !!isOpenAddModalDirectly}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseAddModalDirectly) onCloseAddModalDirectly();
        }}
        title={editingItem ? 'Edit Bazar Expense' : 'Add New Bazar Entry'}
        subtitle="Log market shopping and grocery costs"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="bazar-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                id="bazar-category-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as BazarCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description / Items <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="bazar-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Miniket Rice (50kg), Eggs (2 crates), Rui Fish"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount ({settings.currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                id="bazar-amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2500"
                min="1"
                step="1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Paid By (Who paid for this?)
              </label>
              <select
                id="bazar-paidby-input"
                value={paidByMemberId}
                onChange={(e) => setPaidByMemberId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="MESS_FUND">Mess Cash Fund (Manager)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} {m.nickname ? `(@${m.nickname})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note (Shop name, receipt details)
            </label>
            <input
              type="text"
              id="bazar-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Kawran Bazar / Wholesale"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100">
            {editingItem ? (
              <button
                type="button"
                id="btn-delete-bazar-from-modal"
                onClick={() => {
                  const target = editingItem;
                  setIsModalOpen(false);
                  setItemToDelete(target);
                }}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Entry</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  if (onCloseAddModalDirectly) onCloseAddModalDirectly();
                }}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-bazar-submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                {editingItem ? 'Update Entry' : 'Add Bazar Entry'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (avoids window.confirm in iframe) */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Delete Bazar Entry"
        subtitle="Are you sure you want to permanently delete this expense?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are deleting: <strong className="text-slate-900">{itemToDelete?.description}</strong>{' '}
            ({itemToDelete && formatCurrency(itemToDelete.amount, settings.currency)}).
          </p>
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setItemToDelete(null)}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-delete-bazar-btn"
              onClick={() => {
                if (itemToDelete) {
                  onDeleteBazar(itemToDelete.id);
                  setItemToDelete(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs cursor-pointer"
            >
              Yes, Delete Entry
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
