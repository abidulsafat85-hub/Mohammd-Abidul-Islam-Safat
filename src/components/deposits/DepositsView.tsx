import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  User,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Member, Deposit, PaymentMethod, MessSettings } from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../services/calculations';
import { formatDateShort } from '../../utils/dateUtils';

interface DepositsViewProps {
  deposits: Deposit[];
  members: Member[];
  onSaveDeposit: (deposit: Deposit) => void;
  onDeleteDeposit: (id: string) => void;
  selectedMonth: string;
  settings: MessSettings;
  isOpenAddModalDirectly?: boolean;
  onCloseAddModalDirectly?: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'bKash', 'Nagad', 'Bank', 'Rocket', 'Other'];

export const DepositsView: React.FC<DepositsViewProps> = ({
  deposits,
  members,
  onSaveDeposit,
  onDeleteDeposit,
  selectedMonth,
  settings,
  isOpenAddModalDirectly,
  onCloseAddModalDirectly,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Deposit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Deposit | null>(null);

  // Form states
  const [memberId, setMemberId] = useState<string>(members[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter for the selected month
  const monthDeposits = deposits.filter((d) => d.date.startsWith(selectedMonth));

  // Open add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setMemberId(members[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setPaymentMethod('Cash');
    setNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (item: Deposit) => {
    setEditingItem(item);
    setMemberId(item.memberId);
    setDate(item.date);
    setAmount(item.amount);
    setPaymentMethod(item.paymentMethod);
    setNote(item.note || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      setFormError('Please select a member.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }

    const deposit: Deposit = {
      id: editingItem ? editingItem.id : `dep-${Date.now()}`,
      memberId,
      date,
      amount: numAmount,
      paymentMethod,
      note: note.trim() || undefined,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    onSaveDeposit(deposit);
    setIsModalOpen(false);
    if (onCloseAddModalDirectly) onCloseAddModalDirectly();
  };

  // Filtered deposits
  const filtered = monthDeposits.filter((d) => {
    const mem = members.find((m) => m.id === d.memberId);
    const memName = mem ? (mem.nickname || mem.fullName).toLowerCase() : '';
    const matchesSearch =
      memName.includes(searchTerm.toLowerCase()) ||
      (d.note && d.note.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMember = selectedMember === 'all' || d.memberId === selectedMember;
    const matchesMethod = selectedMethod === 'all' || d.paymentMethod === selectedMethod;

    return matchesSearch && matchesMember && matchesMethod;
  });

  // Calculate totals
  const totalMonthDeposits = monthDeposits.reduce((a, b) => a + Number(b.amount), 0);

  // Member-wise deposit totals
  const memberDepositTotals = members.map((m) => {
    const total = monthDeposits
      .filter((d) => d.memberId === m.id)
      .reduce((a, b) => a + Number(b.amount), 0);
    return { member: m, total };
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Deposit Management</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Track advances, monthly meal deposits, bKash transfers, and cash collected by manager.
          </p>
        </div>

        <button
          id="btn-add-deposit-main"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Record Deposit</span>
        </button>
      </div>

      {/* Summary Card Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-800 to-emerald-900 p-6 sm:p-7 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Total Deposits for {selectedMonth}
            </span>
            <div className="text-3xl sm:text-4xl font-black mt-1">
              {formatCurrency(totalMonthDeposits, settings.currency)}
            </div>
            <p className="text-xs text-emerald-200 mt-1">
              Total cash collected across {monthDeposits.length} deposit transactions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-xs">
              <span className="text-emerald-200">Active Members:</span>{' '}
              <span className="font-extrabold text-white">{members.filter((m) => m.isActive).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Member-wise Deposit Breakdown Cards */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">
          Member Deposit Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {memberDepositTotals.map(({ member, total }) => (
            <div
              key={member.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                total > 0
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 text-slate-400'
              }`}
            >
              <div className="text-xs font-extrabold text-slate-900 truncate">
                {member.nickname || member.fullName}
              </div>
              <div className="text-lg font-black text-emerald-700 mt-1">
                {formatCurrency(total, settings.currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {monthDeposits.filter((d) => d.memberId === member.id).length} deposits
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            id="deposit-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by member name or notes (e.g. bKash TrxID)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Member Filter */}
          <select
            id="deposit-member-filter"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname || m.fullName}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            id="deposit-method-filter"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-4">Member Name</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Note / TrxID</th>
                <th className="py-3.5 px-5 text-right">Deposit Amount</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No deposits found for this month or search filter.
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((item) => {
                    const mem = members.find((m) => m.id === item.memberId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 text-slate-500 text-xs font-semibold whitespace-nowrap">
                          {formatDateShort(item.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            {mem?.fullName || 'Unknown Member'}
                          </div>
                          {mem?.nickname && (
                            <div className="text-xs text-slate-400">@{mem.nickname}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
                            {item.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {item.note || '—'}
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-emerald-700 text-base">
                          +{formatCurrency(item.amount, settings.currency)}
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
                              title="Delete Deposit"
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen || !!isOpenAddModalDirectly}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseAddModalDirectly) onCloseAddModalDirectly();
        }}
        title={editingItem ? 'Edit Deposit' : 'Record Member Deposit'}
        subtitle="Log advance money or installment paid by member"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Member <span className="text-rose-500">*</span>
            </label>
            <select
              id="deposit-member-select"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} {m.nickname ? `(@${m.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="deposit-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount ({settings.currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                id="deposit-amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2500"
                min="1"
                step="any"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  type="button"
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    paymentMethod === pm
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note (Transaction ID, Handover remarks)
            </label>
            <input
              type="text"
              id="deposit-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. bKash TrxID 9K8827 or Handed to Safat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100">
            {editingItem ? (
              <button
                type="button"
                id="btn-delete-deposit-from-modal"
                onClick={() => {
                  const target = editingItem;
                  setIsModalOpen(false);
                  setItemToDelete(target);
                }}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Deposit</span>
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
                id="btn-save-deposit-submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                {editingItem ? 'Update Deposit' : 'Save Deposit'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (avoids window.confirm in iframe) */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Delete Deposit Entry"
        subtitle="Are you sure you want to permanently delete this deposit record?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are deleting a deposit of{' '}
            <strong className="text-slate-900">
              {itemToDelete && formatCurrency(itemToDelete.amount, settings.currency)}
            </strong>{' '}
            for {members.find((m) => m.id === itemToDelete?.memberId)?.fullName || 'Member'}.
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
              id="confirm-delete-deposit-btn"
              onClick={() => {
                if (itemToDelete) {
                  onDeleteDeposit(itemToDelete.id);
                  setItemToDelete(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs cursor-pointer"
            >
              Yes, Delete Deposit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
