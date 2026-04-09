import { jsPDF } from 'jspdf';

function ensureSpace(doc, y, margin, lineHeight) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + lineHeight > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

/**
 * @param {{ companyName: string; analysis: object }} params
 */
export function exportAnalysisToPdf({ companyName, analysis }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  let y = margin;

  const title = 'Due diligence report';
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  y = ensureSpace(doc, y, margin, 24);
  doc.text(title, margin, y);
  y += 28;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const meta = [
    `Company: ${companyName?.trim() || 'Unknown'}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  for (const line of meta) {
    y = ensureSpace(doc, y, margin, 16);
    doc.text(line, margin, y);
    y += 16;
  }
  y += 12;

  const addSection = (heading, bodyText) => {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    for (const line of doc.splitTextToSize(heading, maxW)) {
      y = ensureSpace(doc, y, margin, 18);
      doc.text(line, margin, y);
      y += 18;
    }
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const body = bodyText || '';
    for (const line of doc.splitTextToSize(body, maxW)) {
      y = ensureSpace(doc, y, margin, 14);
      doc.text(line, margin, y);
      y += 14;
    }
    y += 14;
  };

  addSection('Executive summary', analysis.executiveSummary?.content);

  if (analysis.redFlags?.length) {
    const text = analysis.redFlags
      .map(
        (f) =>
          `${f.severity}: ${f.title}${f.description ? `\n${f.description}` : ''}`
      )
      .join('\n\n');
    addSection(`Red flags (${analysis.redFlags.length})`, text);
  }

  if (analysis.missingData?.length) {
    const text = analysis.missingData
      .map((m) => `• ${m.item} (${m.priority})`)
      .join('\n');
    addSection(`Missing data (${analysis.missingData.length})`, text);
  }

  const safe = (companyName || 'report')
    .trim()
    .replace(/[^\w\d-]+/g, '_')
    .slice(0, 80);
  doc.save(`due-diligence_${safe || 'report'}.pdf`);
}
