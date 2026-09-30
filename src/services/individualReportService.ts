import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  MonthlyAccountingSummary,
  MealRecord,
  Deposit,
  MessSettings,
  MemberMonthlyCalculation,
} from '../types';
import { formatMonthLabel } from '../utils/dateUtils';

export class IndividualReportService {
  /**
   * Helper to produce a sanitized file name like "Safat_September 2026.pdf"
   */
  static getPdfFileName(memberName: string, month: string): string {
    const monthLabel = formatMonthLabel(month);
    // Sanitize illegal filesystem characters: / \ : * ? " < > |
    const safeName = memberName.trim().replace(/[\\/:*?"<>|]/g, '');
    return `${safeName}_${monthLabel}.pdf`;
  }

  /**
   * Generates and downloads a single member's individual PDF statement
   */
  static async downloadSingleMemberPdf(
    calc: MemberMonthlyCalculation,
    summary: MonthlyAccountingSummary,
    meals: MealRecord[],
    deposits: Deposit[],
    settings: MessSettings
  ): Promise<string> {
    const currency = 'Tk';
    const monthLabel = formatMonthLabel(summary.month);
    const [year, month] = summary.month.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const pdfBlob = await this.renderMemberPdfBlob(
      calc,
      summary,
      meals,
      deposits,
      settings,
      currency,
      monthLabel,
      year,
      month,
      daysInMonth
    );

    const fileName = this.getPdfFileName(calc.member.fullName, summary.month);

    const downloadUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    return fileName;
  }

  /**
   * Generates individual PDF statements for all members with meals,
   * bundles them into a ZIP archive, and downloads the ZIP file.
   */
  static async generateAndDownloadZip(
    summary: MonthlyAccountingSummary,
    meals: MealRecord[],
    deposits: Deposit[],
    settings: MessSettings,
    onProgress?: (current: number, total: number, memberName: string) => void
  ): Promise<{ count: number; zipName: string }> {
    const zip = new JSZip();

    // Filter members who ate meals in this month (or fallback to all members)
    let membersToExport = summary.memberCalculations.filter((m) => m.totalMeals > 0);
    if (membersToExport.length === 0) {
      membersToExport = summary.memberCalculations;
    }

    const totalMembers = membersToExport.length;
    const currency = 'Tk';
    const monthLabel = formatMonthLabel(summary.month);
    const [year, month] = summary.month.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < membersToExport.length; i++) {
      const calc = membersToExport[i];
      if (onProgress) {
        onProgress(i + 1, totalMembers, calc.member.fullName);
      }

      // Generate the 100% vector PDF blob for this member
      const pdfBlob = await this.renderMemberPdfBlob(
        calc,
        summary,
        meals,
        deposits,
        settings,
        currency,
        monthLabel,
        year,
        month,
        daysInMonth
      );

      // File name format: Safat_September 2026.pdf
      const fileName = this.getPdfFileName(calc.member.fullName, summary.month);
      zip.file(fileName, pdfBlob);
    }

    // Generate compressed ZIP file
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const safeMonthLabel = monthLabel.replace(/[\\/:*?"<>|]/g, '_');
    const zipFileName = `Individual_Reports_${safeMonthLabel}.zip`;

    const downloadUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    return { count: totalMembers, zipName: zipFileName };
  }

  /**
   * Renders a 100% Vector Ultra-HD individual member monthly statement using native jsPDF & autoTable.
   * Completely eliminates raster blurriness, pixelation, and artifacts at any zoom level.
   */
  private static renderMemberPdfBlob(
    calc: MemberMonthlyCalculation,
    summary: MonthlyAccountingSummary,
    meals: MealRecord[],
    deposits: Deposit[],
    settings: MessSettings,
    currency: string,
    monthLabel: string,
    year: number,
    month: number,
    daysInMonth: number
  ): Promise<Blob> {
    return new Promise((resolve) => {
      // 1. Initialize Standard A4 PDF Document (210mm x 297mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const memberDue =
        calc.due !== undefined
          ? calc.due
          : calc.mealCost > calc.totalCredits
          ? calc.mealCost - calc.totalCredits
          : 0;
      const isPositive = calc.balance >= 0;

      // 2. Top Header Banner (Vector Emerald Gradient-style bar)
      doc.setFillColor(4, 120, 87); // emerald-700
      doc.rect(0, 0, 210, 20, 'F');

      // Left Brand Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text(settings.messName || 'Mess', 12, 12.5);

      // Right Statement Title & Attribution
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('INDIVIDUAL MONTHLY MEAL STATEMENT', 198, 7.5, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(254, 240, 138); // amber-200
      doc.text(monthLabel.toUpperCase(), 198, 12, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(226, 232, 240); // slate-200
      doc.text('Generated by: Abidul Islam Safat', 198, 16.5, { align: 'right' });

      // 3. Member Profile Card
      const cardX = 12;
      const cardY = 24;
      const cardW = 186;
      const cardH = 13.5;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, 'FD');

      // Member Initial Avatar Circle
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.setLineWidth(0.3);
      doc.circle(cardX + 6.5, cardY + 6.75, 4.5, 'FD');

      const initial = (calc.member.fullName.trim().charAt(0) || 'M').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(4, 120, 87);
      doc.text(initial, cardX + 6.5, cardY + 8.2, { align: 'center' });

      // Member Full Name (Clean without ID)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(calc.member.fullName, cardX + 14, cardY + 8.2);

      // Right Stats Pill Container
      const pillW = 74;
      const pillH = 10;
      const pillX = cardX + cardW - pillW - 2;
      const pillY = cardY + 1.75;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(pillX, pillY, pillW, pillH, 1.8, 1.8, 'FD');

      // Stat 1: Meal Rate
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text('MEAL RATE', pillX + 11, pillY + 3.6, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${currency} ${summary.mealRate.toFixed(2)}`, pillX + 11, pillY + 7.8, { align: 'center' });

      // Divider 1
      doc.setDrawColor(226, 232, 240);
      doc.line(pillX + 22, pillY + 1.5, pillX + 22, pillY + 8.5);

      // Stat 2: Total Meals
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text('TOTAL MEALS', pillX + 33, pillY + 3.6, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${calc.totalMeals}`, pillX + 33, pillY + 7.8, { align: 'center' });

      // Divider 2
      doc.setDrawColor(226, 232, 240);
      doc.line(pillX + 44, pillY + 1.5, pillX + 44, pillY + 8.5);

      // Stat 3: Balance / Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text('BALANCE / STATUS', pillX + 59, pillY + 3.6, { align: 'center' });
      doc.setFontSize(7);
      if (isPositive) {
        doc.setTextColor(5, 150, 105);
        doc.text(`+${Math.round(calc.balance)} (Refund)`, pillX + 59, pillY + 7.8, { align: 'center' });
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`-${Math.round(Math.abs(calc.balance))} (Due)`, pillX + 59, pillY + 7.8, { align: 'center' });
      }

      // 4. Build 30-Day Table Data
      interface DayRowData {
        dateStr: string;
        dateLabel: string;
        dayOfWeek: string;
        isFriday: boolean;
        slotType: 'Lunch + Dinner' | 'Lunch (Only)' | 'Dinner (Only)' | '-';
        extraCount: number;
        mealCount: number;
        cost: number;
        deposit: number;
      }

      const tableData: DayRowData[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = d.toString().padStart(2, '0');
        const monthStr = month.toString().padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        const dateObj = new Date(year, month - 1, d);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
        const dateLabel = `${dayStr} ${monthShort} (${dayName})`;
        const isFriday = dayName === 'Fri';

        const record = meals.find((m) => m.date === dateStr && m.memberId === calc.member.id);
        const count = record ? record.mealCount : 0;
        const cost = count * summary.mealRate;

        // Day deposits
        const dayDeps = deposits.filter((dep) => dep.date === dateStr && dep.memberId === calc.member.id);
        const depTotal = dayDeps.reduce((sum, dep) => sum + dep.amount, 0);

        let slotType: 'Lunch + Dinner' | 'Lunch (Only)' | 'Dinner (Only)' | '-' = '-';
        let extraCount = 0;
        if (count > 0) {
          let base = 0;
          if (record?.lunch && record?.dinner) {
            slotType = 'Lunch + Dinner';
            base = 2;
          } else if (record?.lunch) {
            slotType = 'Lunch (Only)';
            base = 1;
          } else if (record?.dinner) {
            slotType = 'Dinner (Only)';
            base = 1;
          } else {
            slotType = count === 1 ? 'Lunch (Only)' : 'Lunch + Dinner';
            base = count === 1 ? 1 : 2;
          }
          extraCount = Math.max(0, count - base);
        }

        tableData.push({
          dateStr,
          dateLabel,
          dayOfWeek: dayName,
          isFriday,
          slotType,
          extraCount,
          mealCount: count,
          cost,
          deposit: depTotal,
        });
      }

      const tableBody = tableData.map((row) => [
        row.dateLabel,
        row.slotType,
        row.mealCount > 0 ? row.mealCount.toString() : '-',
        row.cost > 0 ? Math.round(row.cost).toLocaleString('en-IN') : '-',
        row.deposit > 0 ? `+${Math.round(row.deposit).toLocaleString('en-IN')}` : '-',
      ]);

      // 5. Render 100% Vector Table using autoTable
      autoTable(doc, {
        startY: 40.5,
        margin: { left: cardX, right: cardX },
        head: [['Date & Day', 'Meal Slot / Type', 'Meals', 'Cost (Tk)', 'Deposit (Tk)']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
          fillColor: [4, 120, 87], // emerald-700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.2,
          cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 },
          valign: 'middle',
        },
        styles: {
          font: 'helvetica',
          fontSize: 6.8,
          cellPadding: { top: 1.15, bottom: 1.15, left: 2.5, right: 2.5 },
          valign: 'middle',
          lineColor: [241, 245, 249],
          lineWidth: 0.15,
        },
        columnStyles: {
          0: { cellWidth: 42, halign: 'left' },
          1: { cellWidth: 48, halign: 'center' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const rowData = tableData[rowIndex];
            if (!rowData) return;

            // Lunch Only row gets a soft warm tint
            if (rowData.slotType === 'Lunch (Only)') {
              data.cell.styles.fillColor = [255, 251, 235]; // amber-50
            } else if (rowIndex % 2 === 1) {
              data.cell.styles.fillColor = [250, 250, 250];
            } else {
              data.cell.styles.fillColor = [255, 255, 255];
            }

            // Friday date is blue
            if (data.column.index === 0) {
              if (rowData.isFriday) {
                data.cell.styles.textColor = [37, 99, 235]; // blue-600
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [51, 65, 85];
                data.cell.styles.fontStyle = 'bold';
              }
            }

            // Hide text for column 1 so our custom vector badge in didDrawCell can render crisply
            if (data.column.index === 1) {
              if (rowData.slotType !== '-') {
                data.cell.text = [''];
              } else {
                data.cell.styles.textColor = [203, 213, 225];
              }
            }

            // Meals count column
            if (data.column.index === 2) {
              if (rowData.mealCount > 0) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor =
                  rowData.slotType === 'Lunch (Only)'
                    ? [180, 83, 9] // rich deep amber
                    : [4, 120, 87]; // emerald-700
              } else {
                data.cell.styles.textColor = [203, 213, 225];
              }
            }

            // Cost column
            if (data.column.index === 3) {
              if (rowData.cost > 0) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [51, 65, 85];
              } else {
                data.cell.styles.textColor = [203, 213, 225];
              }
            }

            // Deposit column
            if (data.column.index === 4) {
              if (rowData.deposit > 0) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [5, 150, 105]; // emerald-600
              } else {
                data.cell.styles.textColor = [203, 213, 225];
              }
            }
          }
        },
        didDrawCell: (data) => {
          // Draw crisp vector pill badges for Meal Slot / Type column
          if (data.section === 'body' && data.column.index === 1) {
            const rowIndex = data.row.index;
            const rowData = tableData[rowIndex];
            if (!rowData || rowData.slotType === '-') return;

            const badgeH = 4.2;
            const badgeY = data.cell.y + (data.cell.height - badgeH) / 2;
            const hasExtra = rowData.extraCount > 0;
            const extraW = 16.5;
            const gap = 1.8;

            let mainW = 26;
            if (rowData.slotType === 'Lunch + Dinner') {
              mainW = hasExtra ? 23 : 26;
            } else {
              mainW = hasExtra ? 20 : 23;
            }

            const totalW = hasExtra ? mainW + gap + extraW : mainW;
            const startX = data.cell.x + (data.cell.width - totalW) / 2;

            if (rowData.slotType === 'Lunch (Only)') {
              // Rich deep amber badge
              doc.setFillColor(180, 83, 9); // #b45309
              doc.roundedRect(startX, badgeY, mainW, badgeH, 1.2, 1.2, 'F');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(hasExtra ? 5.8 : 6.2);
              doc.setTextColor(255, 255, 255);
              doc.text('Lunch (Only)', startX + mainW / 2, badgeY + 3.0, { align: 'center' });
            } else if (rowData.slotType === 'Lunch + Dinner') {
              // Soft emerald badge
              doc.setFillColor(220, 252, 231); // emerald-100
              doc.setDrawColor(167, 243, 208);
              doc.setLineWidth(0.2);
              doc.roundedRect(startX, badgeY, mainW, badgeH, 1.2, 1.2, 'FD');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(hasExtra ? 5.8 : 6.2);
              doc.setTextColor(6, 95, 70); // emerald-800
              doc.text('Lunch + Dinner', startX + mainW / 2, badgeY + 3.0, { align: 'center' });
            } else if (rowData.slotType === 'Dinner (Only)') {
              // Soft indigo badge
              doc.setFillColor(224, 231, 255); // indigo-100
              doc.roundedRect(startX, badgeY, mainW, badgeH, 1.2, 1.2, 'F');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(hasExtra ? 5.8 : 6.2);
              doc.setTextColor(55, 48, 163); // indigo-800
              doc.text('Dinner (Only)', startX + mainW / 2, badgeY + 3.0, { align: 'center' });
            }

            // Draw Extra badge right next to the slot badge
            if (hasExtra) {
              const extraX = startX + mainW + gap;
              doc.setFillColor(254, 243, 199); // amber-100
              doc.setDrawColor(245, 158, 11); // amber-500
              doc.setLineWidth(0.25);
              doc.roundedRect(extraX, badgeY, extraW, badgeH, 1.2, 1.2, 'FD');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.8);
              doc.setTextColor(180, 83, 9); // amber-800
              doc.text(`+${rowData.extraCount} Extra`, extraX + extraW / 2, badgeY + 3.0, { align: 'center' });
            }
          }
        },
      });

      // 6. Financial Accounting Summary Ledger (Bottom Section)
      const lastTableFinalY = (doc as any).lastAutoTable?.finalY || 195;
      const ledgerY = Math.min(232, lastTableFinalY + 3.5);

      // Ledger Title Bar
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, ledgerY, cardW, 6.2, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('FINANCIAL ACCOUNTING SUMMARY', cardX + 4, ledgerY + 4.3);

      // 4 Metric Summary Cards side by side
      const boxY = ledgerY + 8;
      const boxW = 44;
      const boxH = 17.5;
      const gap = (cardW - boxW * 4) / 3;

      // Box 1: Total Consumed Meals
      const b1X = cardX;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(b1X, boxY, boxW, boxH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL CONSUMED MEALS', b1X + 3.5, boxY + 4.5);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${calc.totalMeals} Meals`, b1X + 3.5, boxY + 10.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Rate: Tk ${summary.mealRate.toFixed(2)} /meal`, b1X + 3.5, boxY + 14.5);

      // Box 2: Total Running Meal Cost
      const b2X = b1X + boxW + gap;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(b2X, boxY, boxW, boxH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL RUNNING MEAL COST', b2X + 3.5, boxY + 4.5);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${currency} ${Math.round(calc.mealCost).toLocaleString('en-IN')}`, b2X + 3.5, boxY + 10.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Calculated: ${calc.totalMeals} x ${summary.mealRate.toFixed(2)}`, b2X + 3.5, boxY + 14.5);

      // Box 3: Total Deposit Paid
      const b3X = b2X + boxW + gap;
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.setLineWidth(0.35);
      doc.roundedRect(b3X, boxY, boxW, boxH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(6, 95, 70);
      doc.text('TOTAL DEPOSIT PAID', b3X + 3.5, boxY + 4.5);

      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105);
      doc.text(`${currency} ${Math.round(calc.totalDeposits).toLocaleString('en-IN')}`, b3X + 3.5, boxY + 10.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(52, 211, 153);
      doc.text('Cash collected by manager', b3X + 3.5, boxY + 14.5);

      // Box 4: Due or Refund
      const b4X = b3X + boxW + gap;
      if (memberDue > 0) {
        doc.setFillColor(254, 242, 242); // rose-50
        doc.setDrawColor(254, 202, 202); // rose-200
        doc.setLineWidth(0.4);
        doc.roundedRect(b4X, boxY, boxW, boxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(159, 18, 57);
        doc.text('PAYMENT DUE', b4X + 3.5, boxY + 4.5);

        doc.setFontSize(11);
        doc.setTextColor(225, 29, 72);
        doc.text(`${currency} ${Math.round(memberDue).toLocaleString('en-IN')}`, b4X + 3.5, boxY + 10.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(251, 113, 133);
        doc.text('Please clear before next month', b4X + 3.5, boxY + 14.5);
      } else {
        doc.setFillColor(236, 253, 245); // emerald-50
        doc.setDrawColor(110, 231, 183); // emerald-300
        doc.setLineWidth(0.4);
        doc.roundedRect(b4X, boxY, boxW, boxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(6, 95, 70);
        doc.text('REFUND BALANCE', b4X + 3.5, boxY + 4.5);

        doc.setFontSize(11);
        doc.setTextColor(5, 150, 105);
        doc.text(`+${currency} ${Math.round(calc.balance).toLocaleString('en-IN')}`, b4X + 3.5, boxY + 10.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(52, 211, 153);
        doc.text('Excess deposit available', b4X + 3.5, boxY + 14.5);
      }

      // 7. Subtle Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Automated individual meal statement generated via MessMate Smart Mess Management system. All rights reserved.',
        105,
        282,
        { align: 'center' }
      );

      // Output native vector PDF Blob
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }
}
