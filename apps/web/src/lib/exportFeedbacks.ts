function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function csvCell(value: string) {
  const escaped = (value ?? '').replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportToCSV(feedbacks: any[], filename: string) {
  const headers = ['#', 'Content', 'AI Summary', 'Category', 'Sentiment %', 'Tags', 'Source', 'Status', 'Created At'];

  const rows = feedbacks.map((fb, i) => [
    String(i + 1),
    csvCell(fb.content || ''),
    csvCell(fb.aiSummary || ''),
    csvCell(fb.category || ''),
    fb.sentimentScore != null ? String(Math.round(fb.sentimentScore * 100)) : '',
    csvCell((fb.tags || []).join(', ')),
    csvCell(fb.source || ''),
    csvCell(fb.status || ''),
    csvCell(fb.createdAt ? new Date(fb.createdAt).toLocaleString() : ''),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const SENTIMENT_COLOR = (score: number | null) => {
  if (score == null) return '#888';
  if (score > 0.6) return '#10b981';
  if (score < 0.4) return '#ef4444';
  return '#f59e0b';
};

const CATEGORY_STYLE: Record<string, string> = {
  Bug: 'background:#fee2e2;color:#991b1b',
  Feature: 'background:#d1fae5;color:#065f46',
  'UI/UX': 'background:#fce7f3;color:#831843',
};

export function exportToPDF(feedbacks: any[], title: string) {
  const rows = feedbacks.map((fb, i) => {
    const catStyle = CATEGORY_STYLE[fb.category] || 'background:#f3f4f6;color:#374151';
    const sentiment = fb.sentimentScore != null
      ? `<span style="font-weight:600;color:${SENTIMENT_COLOR(fb.sentimentScore)}">${Math.round(fb.sentimentScore * 100)}%</span>`
      : '—';
    const tags = (fb.tags || []).map((t: string) =>
      `<span style="display:inline-block;margin:1px 2px;padding:0 4px;background:#f1f5f9;border-radius:3px;font-size:9px;color:#475569">#${escapeHtml(t)}</span>`
    ).join('');
    const cat = fb.category
      ? `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;${catStyle}">${escapeHtml(fb.category)}</span>`
      : '—';

    return `<tr>
      <td style="color:#9ca3af;width:28px">${i + 1}</td>
      <td style="max-width:220px;word-break:break-word">${escapeHtml(fb.content || '')}</td>
      <td style="max-width:180px;word-break:break-word;color:#6b7280;font-style:italic">${escapeHtml(fb.aiSummary || '—')}</td>
      <td>${cat}</td>
      <td style="text-align:center">${sentiment}</td>
      <td style="word-break:break-word">${tags || '—'}</td>
      <td style="color:#6b7280;font-size:9px;white-space:nowrap">${fb.status || ''}</td>
      <td style="color:#9ca3af;font-size:9px;white-space:nowrap">${fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  header { margin-bottom: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
  header h1 { font-size: 18px; color: #4f46e5; }
  header p { color: #6b7280; font-size: 10px; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead tr { background: #4f46e5; }
  thead th { color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f9fafb; }
  @media print {
    body { padding: 8px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <p>Exported ${new Date().toLocaleString()} &middot; ${feedbacks.length} item${feedbacks.length !== 1 ? 's' : ''}</p>
</header>
<table>
  <thead>
    <tr>
      <th>#</th><th>Content</th><th>AI Summary</th><th>Category</th><th>Sentiment</th><th>Tags</th><th>Status</th><th>Date</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1000,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
