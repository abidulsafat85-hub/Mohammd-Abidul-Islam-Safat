import * as XLSX from 'xlsx';
import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  MonthlyAccountingSummary,
  MessSettings,
} from '../types';

export interface ImportPreviewData {
  members: Partial<Member>[];
  meals: Partial<MealRecord>[];
  bazar: Partial<BazarExpense>[];
  deposits: Partial<Deposit>[];
  summaryText: string;
}

export class ExcelService {
  // Export complete monthly report to XLSX
  static exportMonthlyReport(
    summary: MonthlyAccountingSummary,
    meals: MealRecord[],
    bazar: BazarExpense[],
    deposits: Deposit[],
    settings: MessSettings
  ): void {
    const wb = XLSX.utils.book_new();

    // 1. Member Accounting Sheet
    const memberRows = summary.memberCalculations.map((calc, idx) => ({
      'SL': idx + 1,
      'Member Name': calc.member.fullName,
      'Nickname': calc.member.nickname || '',
      'Total Meals': calc.totalMeals,
      'Meal Rate (৳)': Number(summary.mealRate.toFixed(2)),
      'Meal Cost (৳)': Math.round(calc.mealCost),
      'Shared Fixed Cost (৳)': Math.round(calc.sharedFixedCost),
      'Total Cost (৳)': Math.round(calc.totalCost),
      'Direct Deposits (৳)': Math.round(calc.totalDeposits),
      'Bazar/Expense Paid (৳)': Math.round(calc.bazarPaidOutPocket),
      'Total Credits (৳)': Math.round(calc.totalCredits),
      'Balance (৳)': Math.round(calc.balance),
      'Status': calc.status === 'refund' ? 'Refund (+)' : calc.status === 'due' ? 'Due (-)' : 'Settled',
    }));

    // Add summary row
    memberRows.push({
      'SL': 0,
      'Member Name': 'TOTAL / SUMMARY',
      'Nickname': '',
      'Total Meals': summary.totalMeals,
      'Meal Rate (৳)': Number(summary.mealRate.toFixed(2)),
      'Meal Cost (৳)': Math.round(summary.memberCalculations.reduce((a, b) => a + b.mealCost, 0)),
      'Shared Fixed Cost (৳)': Math.round(summary.memberCalculations.reduce((a, b) => a + b.sharedFixedCost, 0)),
      'Total Cost (৳)': Math.round(summary.memberCalculations.reduce((a, b) => a + b.totalCost, 0)),
      'Direct Deposits (৳)': Math.round(summary.totalDeposits),
      'Bazar/Expense Paid (৳)': Math.round(summary.memberCalculations.reduce((a, b) => a + b.bazarPaidOutPocket, 0)),
      'Total Credits (৳)': Math.round(summary.totalMemberCredits),
      'Balance (৳)': Math.round(summary.memberCalculations.reduce((a, b) => a + b.balance, 0)),
      'Status': '',
    });

    const wsMembers = XLSX.utils.json_to_sheet(memberRows);
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Member Summary');

    // 2. Bazar Expenses Sheet
    const monthBazar = bazar
      .filter((b) => b.date.startsWith(summary.month))
      .sort((a, b) => a.date.localeCompare(b.date));

    const bazarRows = monthBazar.map((b, idx) => {
      const payer = summary.memberCalculations.find((m) => m.member.id === b.paidByMemberId);
      return {
        'SL': idx + 1,
        'Date': b.date,
        'Description': b.description,
        'Category': b.category,
        'Amount (৳)': b.amount,
        'Paid By': b.paidByMemberId === 'MESS_FUND' ? 'Mess Fund (Cash)' : payer?.member.fullName || b.paidByMemberId,
        'Note': b.note || '',
      };
    });
    const wsBazar = XLSX.utils.json_to_sheet(bazarRows);
    XLSX.utils.book_append_sheet(wb, wsBazar, 'Bazar Expenses');

    // 3. Deposits Sheet
    const monthDeposits = deposits
      .filter((d) => d.date.startsWith(summary.month))
      .sort((a, b) => a.date.localeCompare(b.date));

    const depositRows = monthDeposits.map((d, idx) => {
      const mem = summary.memberCalculations.find((m) => m.member.id === d.memberId);
      return {
        'SL': idx + 1,
        'Date': d.date,
        'Member Name': mem?.member.fullName || d.memberId,
        'Amount (৳)': d.amount,
        'Payment Method': d.paymentMethod,
        'Note': d.note || '',
      };
    });
    const wsDeposits = XLSX.utils.json_to_sheet(depositRows);
    XLSX.utils.book_append_sheet(wb, wsDeposits, 'Deposits');

    // Trigger download
    XLSX.writeFile(wb, `${settings.messName.replace(/\s+/g, '_')}_Report_${summary.month}.xlsx`);
  }

  // Export CSV of member summary
  static exportSummaryCSV(summary: MonthlyAccountingSummary, settings: MessSettings): void {
    const headers = [
      'Member Name',
      'Total Meals',
      'Meal Rate',
      'Meal Cost',
      'Total Cost',
      'Deposits',
      'Balance',
      'Status',
    ];
    const rows = summary.memberCalculations.map((c) => [
      `"${c.member.fullName}"`,
      c.totalMeals,
      summary.mealRate.toFixed(2),
      Math.round(c.mealCost),
      Math.round(c.totalCost),
      Math.round(c.totalCredits),
      Math.round(c.balance),
      c.status.toUpperCase(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${settings.messName.replace(/\s+/g, '_')}_${summary.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Download a clean Excel template
  static downloadTemplate(): void {
    const wb = XLSX.utils.book_new();

    const sampleMembers = [
      { 'Full Name': 'Abidul Safat', 'Nickname': 'Safat', 'Phone': '01712345678', 'Initial Deposit': 0, 'Active': 'YES' },
      { 'Full Name': 'Abdur Rahim', 'Nickname': 'Rahim', 'Phone': '01812345679', 'Initial Deposit': 0, 'Active': 'YES' },
      { 'Full Name': 'Rezaul Karim', 'Nickname': 'Karim', 'Phone': '01912345680', 'Initial Deposit': 0, 'Active': 'YES' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleMembers), 'Members');

    const sampleMeals = [
      { 'Date': '2026-09-01', 'Member Name': 'Abidul Safat', 'Meal Count': 2 },
      { 'Date': '2026-09-01', 'Member Name': 'Abdur Rahim', 'Meal Count': 2 },
      { 'Date': '2026-09-01', 'Member Name': 'Rezaul Karim', 'Meal Count': 1 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleMeals), 'Meals');

    const sampleBazar = [
      { 'Date': '2026-09-01', 'Description': 'Rice (50kg)', 'Category': 'Rice', 'Amount': 3450, 'Paid By': 'Abidul Safat', 'Note': 'Miniket' },
      { 'Date': '2026-09-02', 'Description': 'Vegetables', 'Category': 'Vegetable', 'Amount': 500, 'Paid By': 'Abdur Rahim', 'Note': '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleBazar), 'Bazar');

    const sampleDeposits = [
      { 'Date': '2026-09-01', 'Member Name': 'Abidul Safat', 'Amount': 2000, 'Method': 'bKash', 'Note': 'Advance' },
      { 'Date': '2026-09-01', 'Member Name': 'Abdur Rahim', 'Amount': 2000, 'Method': 'Cash', 'Note': '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleDeposits), 'Deposits');

    XLSX.writeFile(wb, 'MessMate_Excel_Template.xlsx');
  }

  // Parse Excel file and extract preview data
  static async parseExcelFile(file: File, existingMembers: Member[]): Promise<ImportPreviewData> {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    const newMembers: Partial<Member>[] = [];
    const newMeals: Partial<MealRecord>[] = [];
    const newBazar: Partial<BazarExpense>[] = [];
    const newDeposits: Partial<Deposit>[] = [];

    // Helper map to match member names to IDs
    const memberNameToId = new Map<string, string>();
    existingMembers.forEach((m) => {
      memberNameToId.set(m.fullName.toLowerCase().trim(), m.id);
      if (m.nickname) memberNameToId.set(m.nickname.toLowerCase().trim(), m.id);
    });

    // Check each sheet
    for (const sheetName of wb.SheetNames) {
      const lower = sheetName.toLowerCase();
      const sheet = wb.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      if (lower.includes('member')) {
        for (const row of json) {
          const name = row['Full Name'] || row['Name'] || row['Member Name'] || row['Member'];
          if (name) {
            const nickname = row['Nickname'] || row['Nick'] || '';
            const phone = String(row['Phone'] || row['Mobile'] || '');
            const initialDeposit = Number(row['Initial Deposit'] || row['Deposit'] || 0);
            const activeStr = String(row['Active'] || row['Status'] || 'YES').toUpperCase();
            const isActive = !activeStr.includes('NO') && !activeStr.includes('INACTIVE');

            const id = 'mem-' + Math.random().toString(36).substring(2, 9);
            memberNameToId.set(String(name).toLowerCase().trim(), id);
            if (nickname) memberNameToId.set(String(nickname).toLowerCase().trim(), id);

            newMembers.push({
              id,
              fullName: String(name).trim(),
              nickname: nickname ? String(nickname).trim() : undefined,
              phone: phone || undefined,
              joinDate: new Date().toISOString().split('T')[0],
              initialDeposit: isNaN(initialDeposit) ? 0 : initialDeposit,
              isActive,
            });
          }
        }
      } else if (lower.includes('meal')) {
        for (const row of json) {
          const date = row['Date'] || row['Meal Date'];
          const memberName = row['Member Name'] || row['Member'] || row['Name'];
          const count = Number(row['Meal Count'] || row['Meals'] || row['Count'] || 1);

          if (date && memberName) {
            const dateStr = String(date).substring(0, 10);
            const targetId = memberNameToId.get(String(memberName).toLowerCase().trim()) || 'unknown';

            newMeals.push({
              id: 'meal-' + Math.random().toString(36).substring(2, 9),
              date: dateStr,
              memberId: targetId,
              mealCount: isNaN(count) ? 1 : count,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } else if (lower.includes('bazar') || lower.includes('market') || lower.includes('expense')) {
        for (const row of json) {
          const date = row['Date'] || row['Bazar Date'];
          const desc = row['Description'] || row['Item'] || row['Details'] || 'Bazar Item';
          const amount = Number(row['Amount'] || row['Cost'] || row['Price'] || 0);
          const payerName = row['Paid By'] || row['Payer'] || row['Member'];
          const cat = row['Category'] || 'Grocery';
          const note = row['Note'] || '';

          if (date && amount > 0) {
            const payerId = payerName
              ? memberNameToId.get(String(payerName).toLowerCase().trim()) || 'MESS_FUND'
              : 'MESS_FUND';

            newBazar.push({
              id: 'baz-' + Math.random().toString(36).substring(2, 9),
              date: String(date).substring(0, 10),
              description: String(desc),
              category: cat,
              amount: isNaN(amount) ? 0 : amount,
              paidByMemberId: payerId,
              note: note ? String(note) : undefined,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } else if (lower.includes('deposit') || lower.includes('payment')) {
        for (const row of json) {
          const date = row['Date'] || row['Deposit Date'];
          const memberName = row['Member Name'] || row['Member'] || row['Name'];
          const amount = Number(row['Amount'] || row['Deposit'] || 0);
          const method = row['Method'] || row['Payment Method'] || 'Cash';
          const note = row['Note'] || '';

          if (date && memberName && amount > 0) {
            const memId = memberNameToId.get(String(memberName).toLowerCase().trim()) || 'unknown';
            newDeposits.push({
              id: 'dep-' + Math.random().toString(36).substring(2, 9),
              memberId: memId,
              date: String(date).substring(0, 10),
              amount: isNaN(amount) ? 0 : amount,
              paymentMethod: method,
              note: note ? String(note) : undefined,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    const summaryText = `Detected: ${newMembers.length} members, ${newMeals.length} meal records, ${newBazar.length} bazar expenses, ${newDeposits.length} deposits.`;

    return {
      members: newMembers,
      meals: newMeals,
      bazar: newBazar,
      deposits: newDeposits,
      summaryText,
    };
  }
}
