export class FilePanel {
  constructor(hostEl, { onLocal, onURL }) {
    this.hostEl = hostEl;
    this.onLocal = onLocal;
    this.onURL = onURL;
    this._render();
  }

  _render() {
    this.hostEl.innerHTML = `
      <div class="row"><button class="button" id="open-local">Open Local File</button><input type="file" id="file-input" accept=".duckdb,.parquet,.csv,.json" hidden /></div>
      <div class="row"><input id="url-input" type="text" placeholder="https://... (.parquet | .csv | .json | .duckdb)" value="https://s3.waw3-1.cloudferro.com/emodnet/minkadata/newseawatchb.duckdb" /><button class="button" id="open-url">Register URL</button></div>
      <div class="small">S3: use presigned HTTPS; allow GET/HEAD with Range. Supports DuckDB, Parquet, CSV, and JSON files.</div>
    `;
    this.hostEl.querySelector('#open-local').addEventListener('click', () => {
      this.hostEl.querySelector('#file-input').click();
    });
    this.hostEl.querySelector('#file-input').addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) this.onLocal(f);
    });
    this.hostEl.querySelector('#open-url').addEventListener('click', () => {
      const url = this.hostEl.querySelector('#url-input').value.trim();
      if (url) this.onURL(url);
    });
  }
}
