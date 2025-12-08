export class Logger {
  constructor(hostEl) { this.hostEl = hostEl; }
  log(msg) {
    const ts = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.textContent = `[${ts}] ${msg}`;
    this.hostEl.appendChild(line);
    this.hostEl.scrollTop = this.hostEl.scrollHeight;
    console.log(msg);
  }
}
