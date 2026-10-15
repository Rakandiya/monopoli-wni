// Modul Viewer Console Log Sistem In-Game (+62 Debugger)
// Menangkap console.log, console.info, console.warn, console.error, & runtime errors
// agar pemain/developer dapat melihat log secara real-time langsung di layar browser tanpa harus membuka F12.

class InGameConsoleViewer {
  constructor() {
    this.logs = [];
    this.maxLogs = 300;
    this.currentFilter = "all";
    this.isOpen = false;
    this.autoScroll = true;
    this.errorCount = 0;

    // Simpan referensi method console asli
    this.origLog = console.log.bind(console);
    this.origInfo = console.info.bind(console);
    this.origWarn = console.warn.bind(console);
    this.origError = console.error.bind(console);
    this.origDebug = console.debug ? console.debug.bind(console) : this.origLog;

    this._interceptConsole();
    this._interceptWindowErrors();

    // DOM Elements (di-bind setelah DOM siap)
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initUI());
    } else {
      this.initUI();
    }
  }

  _interceptConsole() {
    console.log = (...args) => {
      this.origLog(...args);
      this._addEntry("info", args);
    };

    console.info = (...args) => {
      this.origInfo(...args);
      this._addEntry("info", args);
    };

    console.warn = (...args) => {
      this.origWarn(...args);
      this._addEntry("warn", args);
    };

    console.error = (...args) => {
      this.origError(...args);
      this._addEntry("error", args);
    };

    if (console.debug) {
      console.debug = (...args) => {
        this.origDebug(...args);
        this._addEntry("debug", args);
      };
    }
  }

  _interceptWindowErrors() {
    window.addEventListener("error", (event) => {
      const msg = event.error ? event.error.stack || event.error.message : event.message;
      this._addEntry("error", [`[Runtime Error] ${msg}`]);
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
      this._addEntry("error", [`[Unhandled Promise Rejection] ${msg}`]);
    });
  }

  _formatArg(arg) {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }

  _addEntry(type, args) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const text = args.map((a) => this._formatArg(a)).join(" ");

    if (type === "error") {
      this.errorCount++;
      this._updateBadge();
    }

    const entry = {
      id: Date.now() + Math.random(),
      type, // 'info', 'warn', 'error', 'debug'
      time: timeStr,
      text,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this._appendLogDOM(entry);
    this._updateCountDisplay();
  }

  initUI() {
    this.btnToggle = document.getElementById("btn-toggle-console");
    this.btnOpenInsideDebug = document.getElementById("btn-open-console-inside-debug");
    this.modal = document.getElementById("console-modal");
    this.output = document.getElementById("console-output");
    this.btnClose = document.getElementById("btn-close-console");
    this.btnClear = document.getElementById("btn-console-clear");
    this.btnCopy = document.getElementById("btn-console-copy");
    this.badge = document.getElementById("console-badge");
    this.countDisplay = document.getElementById("console-log-count");
    this.chkAutoscroll = document.getElementById("console-autoscroll");

    if (this.btnToggle) {
      this.btnToggle.addEventListener("click", () => this.toggle());
    }

    if (this.btnOpenInsideDebug) {
      this.btnOpenInsideDebug.addEventListener("click", () => this.open());
    }

    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.close());
    }

    if (this.btnClear) {
      this.btnClear.addEventListener("click", () => this.clear());
    }

    if (this.btnCopy) {
      this.btnCopy.addEventListener("click", () => this.copyAll());
    }

    if (this.chkAutoscroll) {
      this.chkAutoscroll.addEventListener("change", (e) => {
        this.autoScroll = e.target.checked;
      });
    }

    // Filter tab buttons
    const filterIds = [
      { id: "btn-console-filter-all", filter: "all" },
      { id: "btn-console-filter-log", filter: "info" },
      { id: "btn-console-filter-warn", filter: "warn" },
      { id: "btn-console-filter-error", filter: "error" },
    ];

    filterIds.forEach(({ id, filter }) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", () => {
        filterIds.forEach(({ id: otherId }) => {
          document.getElementById(otherId)?.classList.remove("active");
        });
        btn.classList.add("active");
        this.setFilter(filter);
      });
    });

    // Close on backdrop click (click outside modal-box)
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.close();
        }
      });
    }

    // Render any logs accumulated before DOM ready
    this._renderAllLogs();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (!this.modal) return;
    this.modal.classList.remove("hidden");
    this.isOpen = true;
    this._renderAllLogs();
    if (this.autoScroll && this.output) {
      this.output.scrollTop = this.output.scrollHeight;
    }
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
    this.isOpen = false;
  }

  clear() {
    this.logs = [];
    this.errorCount = 0;
    this._updateBadge();
    if (this.output) this.output.innerHTML = "";
    this._updateCountDisplay();
  }

  async copyAll() {
    const text = this.logs
      .map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      if (this.btnCopy) {
        const prev = this.btnCopy.textContent;
        this.btnCopy.textContent = "✓ Tersalin!";
        setTimeout(() => {
          this.btnCopy.textContent = prev;
        }, 1500);
      }
    } catch (e) {
      this.origWarn("Gagal menyalin log ke clipboard:", e);
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this._renderAllLogs();
  }

  _updateBadge() {
    if (!this.badge) return;
    if (this.errorCount > 0) {
      this.badge.textContent = `${this.errorCount} Error`;
      this.badge.classList.remove("hidden");
    } else {
      this.badge.classList.add("hidden");
    }
  }

  _updateCountDisplay() {
    if (!this.countDisplay) return;
    const filtered = this._getFilteredLogs();
    this.countDisplay.textContent = `${filtered.length} log${this.currentFilter !== "all" ? ` (${this.currentFilter})` : ""}`;
  }

  _getFilteredLogs() {
    if (this.currentFilter === "all") return this.logs;
    return this.logs.filter((l) => l.type === this.currentFilter);
  }

  _renderAllLogs() {
    if (!this.output) return;
    this.output.innerHTML = "";
    const filtered = this._getFilteredLogs();
    if (filtered.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.color = "#64748b";
      emptyDiv.style.fontStyle = "italic";
      emptyDiv.style.padding = "10px";
      emptyDiv.textContent = "Belum ada log atau filter tidak menemukan log.";
      this.output.appendChild(emptyDiv);
      return;
    }

    filtered.forEach((entry) => {
      this._appendLogDOM(entry, false);
    });

    if (this.autoScroll) {
      this.output.scrollTop = this.output.scrollHeight;
    }
    this._updateCountDisplay();
  }

  _appendLogDOM(entry, checkFilter = true) {
    if (!this.output) return;
    if (checkFilter && this.currentFilter !== "all" && entry.type !== this.currentFilter) {
      return;
    }

    const row = document.createElement("div");
    row.className = `console-log-row log-${entry.type}`;

    const timeSpan = document.createElement("span");
    timeSpan.className = "console-time";
    timeSpan.textContent = `[${entry.time}]`;

    const tagSpan = document.createElement("span");
    tagSpan.className = `console-tag tag-${entry.type}`;
    tagSpan.textContent = entry.type.toUpperCase();

    const textSpan = document.createElement("span");
    textSpan.style.whiteSpace = "pre-wrap";
    textSpan.textContent = entry.text;

    row.appendChild(timeSpan);
    row.appendChild(tagSpan);
    row.appendChild(textSpan);

    this.output.appendChild(row);

    if (this.autoScroll && this.isOpen) {
      this.output.scrollTop = this.output.scrollHeight;
    }
  }
}

export const consoleViewer = new InGameConsoleViewer();
