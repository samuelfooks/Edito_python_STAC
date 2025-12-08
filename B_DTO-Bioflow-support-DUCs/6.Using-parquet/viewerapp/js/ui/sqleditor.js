export class SqlEditor {
  constructor(hostEl, onRun) {
    this.hostEl = hostEl;
    this.onRun = onRun;
    this._render();
  }

  _render() {
    this.hostEl.innerHTML = `
      <div class="row"><textarea id="sql-box"></textarea></div>
      <div class="row" style="justify-content:space-between">
        <div class="small">Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run</div>
        <div class="row">
          <select id="limit-box">
            <option value="50">LIMIT 50</option>
            <option value="100" selected>LIMIT 100</option>
            <option value="1000">LIMIT 1000</option>
          </select>
          <button id="run-btn" class="button">Run</button>
        </div>
      </div>
    `;
    const sql = this.hostEl.querySelector('#sql-box');
    sql.value = "SELECT 'ready' AS status, current_timestamp AS ts;";
    const run = () => {
      const lim = parseInt(this.hostEl.querySelector('#limit-box').value,10);
      let q = sql.value.trim();
      if (/^select/i.test(q) && !/\blimit\b/i.test(q)) q += ` LIMIT ${lim}`;
      this.onRun(q);
    };
    this.hostEl.querySelector('#run-btn').addEventListener('click', run);
    sql.addEventListener('keydown', (e)=>{
      if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') run();
    });
  }

  setTemplateFor(schema, table) {
    const sql = this.hostEl.querySelector('#sql-box');
    sql.value = `SELECT * FROM ${schema}.${table} LIMIT 100;`;
  }
}
