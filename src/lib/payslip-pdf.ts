// Payslip PDF generation utility
// Uses browser's print functionality for PDF generation

export type PayslipData = {
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  baseSalary: number;
  allowances: number;
  deductions: number;
  grossAmount: number;
  netAmount: number;
  currency: string;
  schoolName: string;
  payRunId: string;
  status: string;
};

export function generatePayslipHTML(data: PayslipData): string {
  const formatCurrency = (amount: number) => 
    `${data.currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string | null) => 
    dateStr ? new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${data.employeeName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #1a1a2e;
    }
    .payslip {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #007fff 0%, #0066cc 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .period-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 20px;
      margin-top: 15px;
      font-weight: 500;
    }
    .content {
      padding: 30px;
    }
    .employee-info {
      display: flex;
      justify-content: space-between;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
      margin-bottom: 25px;
    }
    .employee-info div {
      text-align: left;
    }
    .employee-info .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .employee-info .value {
      font-size: 16px;
      font-weight: 600;
      margin-top: 4px;
    }
    .earnings-section, .deductions-section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #eee;
    }
    .line-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .line-item:last-child {
      border-bottom: none;
    }
    .line-item .name {
      color: #444;
    }
    .line-item .amount {
      font-weight: 600;
    }
    .line-item .amount.positive {
      color: #22c55e;
    }
    .line-item .amount.negative {
      color: #ef4444;
    }
    .totals {
      background: linear-gradient(135deg, #007fff 0%, #0066cc 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      margin-top: 20px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
    }
    .totals .row.net {
      font-size: 24px;
      font-weight: 700;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.3);
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-completed {
      background: #dcfce7;
      color: #166534;
    }
    .status-draft {
      background: #fef3c7;
      color: #92400e;
    }
    .status-processing {
      background: #dbeafe;
      color: #1e40af;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .payslip {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <h1>${data.schoolName}</h1>
      <p>Employee Payslip</p>
      <div class="period-badge">
        ${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}
      </div>
    </div>
    
    <div class="content">
      <div class="employee-info">
        <div>
          <div class="label">Employee Name</div>
          <div class="value">${data.employeeName}</div>
        </div>
        <div>
          <div class="label">Email</div>
          <div class="value">${data.employeeEmail}</div>
        </div>
        <div>
          <div class="label">Payment Date</div>
          <div class="value">${formatDate(data.paidAt)}</div>
        </div>
        <div>
          <div class="label">Status</div>
          <div class="value">
            <span class="status-badge status-${data.status}">${data.status}</span>
          </div>
        </div>
      </div>
      
      <div class="earnings-section">
        <div class="section-title">Earnings</div>
        <div class="line-item">
          <span class="name">Base Salary</span>
          <span class="amount positive">${formatCurrency(data.baseSalary)}</span>
        </div>
        <div class="line-item">
          <span class="name">Allowances (Housing, Transport, etc.)</span>
          <span class="amount positive">${formatCurrency(data.allowances)}</span>
        </div>
      </div>
      
      <div class="deductions-section">
        <div class="section-title">Deductions</div>
        <div class="line-item">
          <span class="name">Tax & Other Deductions</span>
          <span class="amount negative">-${formatCurrency(data.deductions)}</span>
        </div>
      </div>
      
      <div class="totals">
        <div class="row">
          <span>Gross Earnings</span>
          <span>${formatCurrency(data.grossAmount)}</span>
        </div>
        <div class="row">
          <span>Total Deductions</span>
          <span>-${formatCurrency(data.deductions)}</span>
        </div>
        <div class="row net">
          <span>Net Pay</span>
          <span>${formatCurrency(data.netAmount)}</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>This is a computer-generated payslip. For queries, contact HR department.</p>
      <p style="margin-top: 5px;">Reference: ${data.payRunId.slice(0, 8).toUpperCase()}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function openPayslipPDF(data: PayslipData) {
  const html = generatePayslipHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export function downloadPayslipPDF(data: PayslipData) {
  const html = generatePayslipHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Payslip_${data.employeeName.replace(/\s+/g, '_')}_${data.periodStart}_${data.periodEnd}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate bulk payslips HTML for multiple employees
export function generateBulkPayslipsHTML(payslips: PayslipData[]): string {
  const individualPayslips = payslips.map(data => {
    const formatCurrency = (amount: number) => 
      `${data.currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatDate = (dateStr: string | null) => 
      dateStr ? new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'N/A';

    return `
    <div class="payslip" style="page-break-after: always;">
      <div class="header">
        <h1>${data.schoolName}</h1>
        <p>Employee Payslip</p>
        <div class="period-badge">
          ${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}
        </div>
      </div>
      
      <div class="content">
        <div class="employee-info">
          <div>
            <div class="label">Employee Name</div>
            <div class="value">${data.employeeName}</div>
          </div>
          <div>
            <div class="label">Email</div>
            <div class="value">${data.employeeEmail}</div>
          </div>
          <div>
            <div class="label">Payment Date</div>
            <div class="value">${formatDate(data.paidAt)}</div>
          </div>
          <div>
            <div class="label">Status</div>
            <div class="value">
              <span class="status-badge status-${data.status}">${data.status}</span>
            </div>
          </div>
        </div>
        
        <div class="earnings-section">
          <div class="section-title">Earnings</div>
          <div class="line-item">
            <span class="name">Base Salary</span>
            <span class="amount positive">${formatCurrency(data.baseSalary)}</span>
          </div>
          <div class="line-item">
            <span class="name">Allowances</span>
            <span class="amount positive">${formatCurrency(data.allowances)}</span>
          </div>
        </div>
        
        <div class="deductions-section">
          <div class="section-title">Deductions</div>
          <div class="line-item">
            <span class="name">Tax & Other Deductions</span>
            <span class="amount negative">-${formatCurrency(data.deductions)}</span>
          </div>
        </div>
        
        <div class="totals">
          <div class="row">
            <span>Gross Earnings</span>
            <span>${formatCurrency(data.grossAmount)}</span>
          </div>
          <div class="row">
            <span>Total Deductions</span>
            <span>-${formatCurrency(data.deductions)}</span>
          </div>
          <div class="row net">
            <span>Net Pay</span>
            <span>${formatCurrency(data.netAmount)}</span>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>Reference: ${data.payRunId.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bulk Payslips</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; color: #1a1a2e; }
    .payslip { max-width: 800px; margin: 0 auto 40px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #007fff 0%, #0066cc 100%); color: white; padding: 25px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 4px; }
    .header p { opacity: 0.9; font-size: 13px; }
    .period-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 16px; margin-top: 12px; font-weight: 500; font-size: 13px; }
    .content { padding: 25px; }
    .employee-info { display: flex; justify-content: space-between; padding: 16px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .employee-info div { text-align: left; min-width: 120px; }
    .employee-info .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .employee-info .value { font-size: 14px; font-weight: 600; margin-top: 3px; }
    .earnings-section, .deductions-section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #eee; }
    .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .line-item:last-child { border-bottom: none; }
    .line-item .name { color: #444; font-size: 14px; }
    .line-item .amount { font-weight: 600; font-size: 14px; }
    .line-item .amount.positive { color: #22c55e; }
    .line-item .amount.negative { color: #ef4444; }
    .totals { background: linear-gradient(135deg, #007fff 0%, #0066cc 100%); color: white; padding: 20px; border-radius: 8px; margin-top: 16px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals .row.net { font-size: 20px; font-weight: 700; padding-top: 12px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.3); }
    .footer { text-align: center; padding: 16px; color: #999; font-size: 11px; border-top: 1px solid #eee; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-processing { background: #dbeafe; color: #1e40af; }
    @media print { body { background: white; padding: 0; } .payslip { box-shadow: none; border-radius: 0; margin-bottom: 0; } }
  </style>
</head>
<body>
  ${individualPayslips}
</body>
</html>
  `;
}

export function openBulkPayslipsPDF(payslips: PayslipData[]) {
  const html = generateBulkPayslipsHTML(payslips);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}

export function downloadBulkPayslipsHTML(payslips: PayslipData[], periodStart: string, periodEnd: string) {
  const html = generateBulkPayslipsHTML(payslips);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Payslips_All_Employees_${periodStart}_${periodEnd}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
