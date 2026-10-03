import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToCsv(filename: string, rows: any[]) {
  if (!rows || !rows.length) return;

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPdf(title: string, filename: string, columns: string[], rows: any[][]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

  (doc as any).autoTable({
    startY: 36,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110] }, // teal-700
    styles: { fontSize: 10, cellPadding: 3 },
  });

  doc.save(`${filename}.pdf`);
}

