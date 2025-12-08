export class TableBrowser {
  constructor(hostEl, { onSelect }) {
    this.hostEl = hostEl;
    this.onSelect = onSelect;
  }

  render(list) {
    if (!list || list.length === 0) {
      this.hostEl.innerHTML = '<div class="small">No tables.</div>';
      return;
    }
    const groups = new Map();
    for (const r of list) {
      if (!groups.has(r.table_schema)) groups.set(r.table_schema, []);
      groups.get(r.table_schema).push(r.table_name);
    }
    let html = '<div class="table-list">';
    for (const [schema, tables] of groups.entries()) {
      html += `<div class="small" style="margin-top:6px;color:#cbd5ff">${schema}</div>`;
      for (const t of tables) {
        html += `<div class="table-item" data-schema="${schema}" data-table="${t}"><div>${t}</div><div class="muted">${schema}.${t}</div></div>`;
      }
    }
    html += '</div>';
    this.hostEl.innerHTML = html;
    this.hostEl.querySelectorAll('.table-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        const schema = el.getAttribute('data-schema');
        const table = el.getAttribute('data-table');
        this.onSelect(schema, table);
      });
    });
  }
}
