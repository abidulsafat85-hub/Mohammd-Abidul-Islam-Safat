import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Phone,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Eye,
  Wallet,
  Utensils,
  TrendingUp,
  MessageCircle,
  Key,
  Share2,
  Copy,
  Check,
  MapPin,
  GraduationCap,
  FileText,
  Mail,
} from 'lucide-react';
import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  MessSettings,
  MonthlyAccountingSummary,
} from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../services/calculations';
import { formatDateShort } from '../../utils/dateUtils';
import { cleanInternationalPhone, formatPhoneDisplay, getWhatsAppDirectUrl } from '../../utils/phoneUtils';

interface MembersViewProps {
  members: Member[];
  onSaveMember: (member: Member, totalDepositAmount?: number) => void;
  onDeleteMember: (memberId: string) => void;
  onToggleActive: (memberId: string) => void;
  meals: MealRecord[];
  bazar?: BazarExpense[];
  deposits: Deposit[];
  summary: MonthlyAccountingSummary;
  settings: MessSettings;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  onSaveMember,
  onDeleteMember,
  onToggleActive,
  meals,
  deposits,
  summary,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [showDeleteUnregisteredModal, setShowDeleteUnregisteredModal] = useState(false);
  const [deleteUnregisteredLoading, setDeleteUnregisteredLoading] = useState(false);

  // Form states - Member Name, Total Deposit Amount, WhatsApp Phone Number, Student ID & Documents
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [location, setLocation] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [totalDeposit, setTotalDeposit] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingMember(null);
    setFullName('');
    setPhone('');
    setUniversityId('');
    setLocation('');
    setParentPhone('');
    setEmail('');
    setNotes('');
    setTotalDeposit('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFullName(member.fullName);
    setPhone(member.phone || '');
    setUniversityId(member.universityId || '');
    setLocation(member.location || '');
    setParentPhone(member.parentPhone || '');
    setEmail(member.email || '');
    setNotes(member.notes || '');
    const currentDeposit = deposits
      .filter((d) => d.memberId === member.id && d.date.startsWith(summary.month))
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const depVal = currentDeposit > 0 ? currentDeposit : (Number(member.initialDeposit) || 0);
    setTotalDeposit(depVal > 0 ? String(depVal) : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('Member name is required.');
      return;
    }

    const cleanPhone = cleanInternationalPhone(phone);
    const depositNum = totalDeposit.trim() === '' ? 0 : Number(totalDeposit) || 0;

    const memberData: Member = {
      id: editingMember ? editingMember.id : `mem-${Date.now()}`,
      fullName: fullName.trim(),
      nickname: editingMember?.nickname,
      phone: cleanPhone || undefined,
      universityId: universityId.trim() || undefined,
      location: location.trim() || undefined,
      parentPhone: parentPhone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      pin: editingMember?.pin || '1234',
      joinDate: editingMember?.joinDate || new Date().toISOString().split('T')[0],
      initialDeposit: depositNum,
      isActive: editingMember ? editingMember.isActive : true,
      registered: editingMember?.registered,
    };

    onSaveMember(memberData, depositNum);
    setIsModalOpen(false);
  };

  // Handle Delete - opens dedicated in-app confirmation modal
  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member);
  };

  // Filtered members
  const filtered = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesActive =
      filterActive === 'all'
        ? true
        : filterActive === 'active'
        ? m.isActive
        : !m.isActive;

    return matchesSearch && matchesActive;
  });

  // Calculate member stats helper
  const getMemberSummary = (memberId: string) => {
    return summary.memberCalculations.find((c) => c.member.id === memberId);
  };

  // Total deposits helper for member
  const getMemberDepositsTotal = (memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    const monthDeps = deposits
      .filter((d) => d.memberId === memberId && d.date.startsWith(summary.month))
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const initial = mem ? Number(mem.initialDeposit) || 0 : 0;
    const total = monthDeps > 0 ? monthDeps : initial;
    return { monthDeps, total, initial };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Total Users (মোট সদস্য)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              {members.length} জন
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            মেসের সকল নিবন্ধিত মেম্বারদের সিরিয়াল অনুযায়ী তালিকা, জমা ও ব্যক্তিগত তথ্য।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {members.filter((m) => !m.registered).length > 0 && (
            <button
              onClick={() => setShowDeleteUnregisteredModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>অনিবন্ধিত মেম্বার মুছুন ({members.filter((m) => !m.registered).length})</span>
            </button>
          )}
          <button
            id="btn-add-member"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member (নতুন সদস্য)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            id="members-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member by name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterActive('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterActive === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterActive === 'active'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({members.filter((m) => m.isActive).length})
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterActive === 'inactive'
                ? 'bg-white text-slate-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactive ({members.filter((m) => !m.isActive).length})
          </button>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member, index) => {
          const memCalc = getMemberSummary(member.id);
          const totalMeals = memCalc ? memCalc.totalMeals : 0;
          const balance = memCalc ? memCalc.balance : 0;
          const isRefund = balance >= 0;
          const depInfo = getMemberDepositsTotal(member.id);
          const serialNo = String(index + 1).padStart(2, '0');

          return (
            <div
              key={member.id}
              id={`member-card-${member.id}`}
              className={`rounded-2xl p-5 border transition-all relative ${
                member.isActive
                  ? 'bg-white border-slate-200/90 shadow-xs hover:border-emerald-300'
                  : 'bg-slate-50/80 border-slate-200 text-slate-400 opacity-75'
              }`}
            >
              {/* Member Card Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar with serial badge */}
                  <div className="relative">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${
                        member.isActive
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {member.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -top-1.5 -left-1.5 bg-slate-900 text-emerald-400 font-mono text-[10px] font-black px-1.5 py-0.2 rounded-md shadow-xs border border-slate-700">
                      #{serialNo}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-base text-slate-900 leading-snug">
                        {member.fullName}
                      </h4>
                    </div>
                    <div className="mt-0.5">
                      {member.registered ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          নিবন্ধিত (Registered)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          অনিবন্ধিত (Not registered)
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {member.email}
                      </span>
                    )}
                    {member.phone ? (
                      <a
                        href={getWhatsAppDirectUrl(member.phone, 'আসসালামু আলাইকুম, মেস মিল আপডেট')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-colors mt-0.5"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3 text-emerald-600" />
                        <span>{formatPhoneDisplay(member.phone)}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 block mt-0.5">No WhatsApp</span>
                    )}
                  </div>
                </div>

                {/* Active badge */}
                <button
                  type="button"
                  id={`btn-toggle-active-${member.id}`}
                  onClick={() => onToggleActive(member.id)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                    member.isActive
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                  title={member.isActive ? 'Click to Deactivate' : 'Click to Reactivate'}
                >
                  {member.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Deposit Info Card (Featured Display) */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Deposit Amount
                  </div>
                  <div className="text-lg font-black text-emerald-950">
                    {formatCurrency(depInfo.total, settings.currency)}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active Month
                </span>
              </div>

              {/* Month Snapshot: Meals & Current Balance */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Month Meals</span>
                  <div className="font-extrabold text-slate-900 text-sm">{totalMeals}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Current Balance</span>
                  <div className={`font-extrabold text-sm ${isRefund ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isRefund ? '+' : ''}
                    {formatCurrency(balance, settings.currency)}
                  </div>
                </div>
              </div>

              {/* Personal Access & Share link */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Key className="h-3 w-3 text-amber-600" />
                  PIN: <strong className="text-slate-800">{member.pin || '1234'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/member/meal`;
                    navigator.clipboard.writeText(url);
                    setCopiedMemberId(member.id);
                    setTimeout(() => setCopiedMemberId(null), 2500);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  title="এই মেম্বারের ব্যক্তিগত পোর্টাল লিংক কপি করুন"
                >
                  {copiedMemberId === member.id ? (
                    <>
                      <Check className="h-3 w-3 text-teal-600" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3 w-3 text-teal-600" />
                      <span>শেয়ার লিংক</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <button
                  id={`btn-view-member-${member.id}`}
                  onClick={() => setViewingMember(member)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Details</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`btn-edit-member-${member.id}`}
                    onClick={() => handleOpenEdit(member)}
                    className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Edit Member"
                    aria-label={`Edit ${member.fullName}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    id={`btn-delete-member-${member.id}`}
                    onClick={() => handleDeleteClick(member)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Member"
                    aria-label={`Delete ${member.fullName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Add/Edit Modal (Simplified: Only Name and Deposit Amount) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? 'Edit Member' : 'Add New Member'}
        subtitle={editingMember ? 'Update member name and deposit' : 'Enter member name and deposit amount'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Field 1: Member Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Member Name (নাম) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="member-fullname-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Abidul Safat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* Field 2: WhatsApp Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp Phone Number (হোয়াটসঅ্যাপ নম্বর)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">88017XXXXXXXX</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="tel"
                id="member-whatsapp-phone-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01712345678 or 8801712345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              স্বয়ংক্রিয় সকাল ০৬:০০ ও দুপুর ০২:০০ টার হোয়াটসঅ্যাপ মিল পোলের জন্য ব্যবহৃত হবে।
            </p>
          </div>

          {/* Field 3: Total Deposit Amount (No sticky 0, type anything freely) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Total Deposit Amount ({settings.currency})
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="member-total-deposit-input"
              value={totalDeposit}
              onChange={(e) => setTotalDeposit(e.target.value)}
              placeholder="জমার পরিমাণ লিখুন (যেমন: ৫০০ বা খালি রাখুন)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              মেসের মিল ও খরচের সাথে সমন্বয় করা মূল জমা টাকা।
            </p>
          </div>

          {/* Field 4: Student ID (ভার্সিটি / স্টুডেন্ট আইডি নং) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <span>Student ID (ভার্সিটি / স্টুডেন্ট আইডি নং)</span>
            </label>
            <input
              type="text"
              id="member-studentid-input"
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              placeholder="রেজিস্ট্রেশনকৃত আইডি যেমন: 2022-1-60-001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-medium"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              রেজিস্ট্রেশনের সময় প্রদানকৃত বিশ্ববিদ্যালয়ের ছাত্র/ছাত্রী আইডি নম্বর।
            </p>
          </div>

          {/* Field 5: Student Documents & Information (রেজিস্ট্রেশনের সময় প্রদত্ত ডকুমেন্টস ও তথ্য) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>রেজিস্ট্রেশনের সময় প্রদত্ত তথ্য ও ডকুমেন্টস (Documents)</span>
            </div>

            {/* Room / Address */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-500" />
                <span>রুম নম্বর বা বর্তমান ঠিকানা (Room / Address):</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="যেমন: রুম ৩০২, ৩য় তলা / মিরপুর"
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-500" />
                <span>মা/বাবার (অভিভাবক) ফোন নম্বর:</span>
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="যেমন: 01711000000"
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-500" />
                <span>ইমেইল অ্যাড্রেস (Email):</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@gmail.com"
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Notes / Documents details */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                ডকুমেন্টস বিবরণী বা বিশেষ নোট:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="আইডি কার্ড বা জাতীয় পরিচয়পত্রের তথ্য, জমা দেওয়া ডকুমেন্টস ইত্যাদি..."
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100">
            {editingMember ? (
              <button
                type="button"
                id="btn-modal-delete-member"
                onClick={() => {
                  const toDel = editingMember;
                  setIsModalOpen(false);
                  setMemberToDelete(toDel);
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Member</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-member-submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                {editingMember ? 'Save Changes' : 'Create Member'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Member Details Drilldown Modal */}
      {viewingMember && (
        <Modal
          isOpen={!!viewingMember}
          onClose={() => setViewingMember(null)}
          title={viewingMember.fullName}
          subtitle={`Member Details & Monthly Summary (${summary.month})`}
        >
          {(() => {
            const calc = getMemberSummary(viewingMember.id);
            const memDeposits = deposits.filter((d) => d.memberId === viewingMember.id && d.date.startsWith(summary.month));
            const depInfo = getMemberDepositsTotal(viewingMember.id);

            return (
              <div className="space-y-4 text-sm">
                {/* Balance Banner */}
                <div
                  className={`p-4 rounded-2xl border ${
                    (calc?.balance || 0) >= 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Calculated Monthly Balance
                  </div>
                  <div className="text-2xl font-black mt-1">
                    {(calc?.balance || 0) >= 0 ? 'Refund: +' : 'Due: '}
                    {formatCurrency(calc?.balance || 0, settings.currency)}
                  </div>
                  <div className="text-xs mt-1 text-slate-600">
                    Total Credits {formatCurrency(calc?.totalCredits || 0, settings.currency)} - Total Cost{' '}
                    {formatCurrency(calc?.totalCost || 0, settings.currency)}
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-200/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Member Name:</span>
                    <span className="font-bold text-slate-900">{viewingMember.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">WhatsApp Phone:</span>
                    {viewingMember.phone ? (
                      <a
                        href={getWhatsAppDirectUrl(viewingMember.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>{formatPhoneDisplay(viewingMember.phone)}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Not set</span>
                    )}
                  </div>
                  {viewingMember.universityId && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ভার্সিটি আইডি নং:</span>
                      <span className="font-bold text-slate-900 bg-amber-50 text-amber-900 px-2 py-0.5 rounded font-mono text-xs">
                        {viewingMember.universityId}
                      </span>
                    </div>
                  )}
                  {viewingMember.parentPhone && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">মা/বাবার ফোন নম্বর:</span>
                      <a
                        href={`tel:${viewingMember.parentPhone}`}
                        className="font-bold text-slate-800 hover:text-emerald-700 font-mono text-xs"
                      >
                        {viewingMember.parentPhone}
                      </a>
                    </div>
                  )}
                  {viewingMember.location && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">লোকেশন / রুম:</span>
                      <span className="font-bold text-slate-900 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-600" />
                        {viewingMember.location}
                      </span>
                    </div>
                  )}
                  {viewingMember.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ইমেইল:</span>
                      <span className="font-bold text-slate-900 text-xs">{viewingMember.email}</span>
                    </div>
                  )}
                  {viewingMember.notes && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">ডকুমেন্টস / নোট:</span>
                      <span className="font-medium text-slate-800 text-xs italic">{viewingMember.notes}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Deposit Amount:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(depInfo.total, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Meals:</span>
                    <span className="font-bold text-slate-900">{calc?.totalMeals || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">Meal Cost:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(calc?.mealCost || 0, settings.currency)}</span>
                  </div>
                </div>

                {/* Deposits List */}
                <div>
                  <h5 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Recent Deposits in {summary.month}
                  </h5>
                  {memDeposits.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No direct deposits recorded this month.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {memDeposits.map((d) => (
                        <div key={d.id} className="flex justify-between text-xs p-2 rounded-lg bg-slate-50">
                          <span>{d.date} • {d.paymentMethod} {d.note && `(${d.note})`}</span>
                          <span className="font-bold text-emerald-800">{formatCurrency(d.amount, settings.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = viewingMember;
                      setViewingMember(null);
                      setMemberToDelete(toDel);
                    }}
                    className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const toEdit = viewingMember;
                        setViewingMember(null);
                        handleOpenEdit(toEdit);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingMember(null)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <Modal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          title="Delete Member (সদস্য ডিলিট)"
          subtitle={`Are you sure you want to permanently delete "${memberToDelete.fullName}"?`}
        >
          <div className="space-y-4">
            {(() => {
              const memMeals = meals.filter((m) => m.memberId === memberToDelete.id && m.mealCount > 0).length;
              const memDepTotal = deposits
                .filter((d) => d.memberId === memberToDelete.id)
                .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

              return (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-slate-800 space-y-3">
                  <div className="flex items-center gap-2.5 text-rose-700 font-bold">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>Permanent Deletion Confirmation</span>
                  </div>
                  <p className="text-xs text-rose-950 leading-relaxed">
                    সদস্য <strong>{memberToDelete.fullName}</strong>-কে কি আপনি মেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?
                  </p>
                  {memMeals > 0 || memDepTotal > 0 ? (
                    <div className="text-xs bg-white/90 p-3 rounded-xl border border-rose-200 text-rose-900 space-y-1.5">
                      <div className="font-semibold text-rose-800">রেকর্ড সংক্রান্ত তথ্য:</div>
                      <div>• মোট মিল এন্ট্রি: <strong>{memMeals} টি</strong></div>
                      <div>• মোট ডিপোজিট: <strong>{formatCurrency(memDepTotal, settings.currency)}</strong></div>
                      <p className="text-[11px] text-rose-600 pt-1 border-t border-rose-100">
                        সদস্যকে ডিলিট করলে এই সদস্যের সাথে সংযুক্ত সকল মিল ও ডিপোজিট রেকর্ডও মুছে যাবে এবং ড্যাশবোর্ড ও রিপোর্টের হিসাব স্বয়ংক্রিয়ভাবে আপডেট হবে।
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">
                      এই সদস্যের কোনো মিল বা ডিপোজিট রেকর্ড নেই। সরাসরি ডিলিট হয়ে যাবে।
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="button"
                id="btn-confirm-delete-member"
                onClick={() => {
                  const id = memberToDelete.id;
                  setMemberToDelete(null);
                  if (viewingMember?.id === id) setViewingMember(null);
                  if (editingMember?.id === id) setIsModalOpen(false);
                  onDeleteMember(id);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Yes, Delete Member (ডিলিট করুন)</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete All Unregistered Members Modal (Task 4) */}
      {showDeleteUnregisteredModal && (
        <Modal
          isOpen={showDeleteUnregisteredModal}
          onClose={() => setShowDeleteUnregisteredModal(false)}
          title="Delete Unregistered Members (অনিবন্ধিত মেম্বার মুছুন)"
          subtitle="যারা নিজে রেজিস্ট্রেশন করেননি তাদের একাউন্ট ও মিল রেকর্ড মুছে ফেলা হবে।"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>সতর্কতা: হিসাব ও ব্যালেন্স পরিবর্তন হবে</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                অনিবন্ধিত মেম্বারদের মুছে ফেললে তাদের নামের মিল ও ডিপোজিট মুছে যাবে, ফলে মেসের বর্তমান মাসের মোট মিল ও প্রত্যেকের বাকি/পাওনা পরিবর্তিত হতে পারে। ডিলিট করার আগে বর্তমান হিসাবের ব্যাকআপ ডাউনলোড করার পরামর্শ দেওয়া হচ্ছে।
              </p>
              
              <div className="pt-1">
                <a
                  href="/api/mess/backup/export"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <span>Download Backup</span>
                </a>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                ডিলিট হতে যাওয়া মেম্বারদের তালিকা ({members.filter((m) => !m.registered).length} জন):
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                {members
                  .filter((m) => !m.registered)
                  .map((m, idx) => (
                    <div key={m.id} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                      <span className="font-semibold text-slate-900">{idx + 1}. {m.fullName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{m.phone || 'No phone'}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteUnregisteredModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={deleteUnregisteredLoading}
                onClick={async () => {
                  setDeleteUnregisteredLoading(true);
                  try {
                    const res = await fetch('/api/mess/members/delete-unregistered', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    const json = await res.json();
                    if (json.success) {
                      setShowDeleteUnregisteredModal(false);
                      window.location.reload();
                    } else {
                      alert(json.error || 'ডিলিট করা যায়নি');
                    }
                  } catch (e: any) {
                    alert(e.message || 'ত্রুটি হয়েছে');
                  } finally {
                    setDeleteUnregisteredLoading(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleteUnregisteredLoading ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, সব অনিবন্ধিত মুছুন'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
