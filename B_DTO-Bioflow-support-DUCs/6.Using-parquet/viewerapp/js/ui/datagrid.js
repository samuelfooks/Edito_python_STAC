export class DataGrid {
  constructor(hostEl) { this.hostEl = hostEl; }

  render(rows) {
    if (!rows || rows.length === 0) {
      this.hostEl.innerHTML = '<div class="small">No rows.</div>';
      return;
    }
    const cols = Object.keys(rows[0]);
    let html = '<div class="grid-wrap"><table><thead><tr>';
    for (const c of cols) html += `<th>${c}</th>`;
    html += '</tr></thead><tbody>';
    for (const r of rows) {
      html += '<tr>';
      for (const c of cols) {
        const v = r[c];
        html += `<td>${v === null || v === undefined ? '<span class="small">null</span>' : String(v)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    this.hostEl.innerHTML = html;
  }
}
