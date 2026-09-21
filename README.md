# 📈 TradeJournal - Professional Trading Journal & Habit Tracker

A modern, high-performance workspace designed for active traders to document daily trading sessions, pre-market preparation, psychological state, execution mistakes, and strict trading habits compliance.

---

## 🚀 Live Demo

- 🌐 **Live Web Application (GitHub Pages)**: **[https://yashdeokar.github.io/TradeJournal/](https://yashdeokar.github.io/TradeJournal/)**
- ⚡ **Netlify Mirror**: **[https://tradostats.netlify.app/](https://tradostats.netlify.app/)**

> **Note**: Both deployments feature zero-server client-side persistence using `localStorage`, interactive Plotly equity charts, 35-day calendar grid, and RFC4180 CSV export.

---

## ✨ Features

- **📊 Interactive Analytics Dashboard**:
  - Net P&L metrics, Win/Loss ratios, Profit Factor, and Average Win vs. Loss.
  - Interactive Equity Growth Curve powered by Plotly.
  - 35-Day Interactive Trading Calendar Grid displaying daily P&L and grade tags.
  - P&L distribution and performance breakdowns.
- **📝 Pre & Post Market Daily Logging**:
  - Detailed pre-market bias, key levels, and tactical setup triggers.
  - Session compliance and pre-market session plan editor.
  - Post-market wins, execution mistakes, psychological state tracking, and letter grades (A–F).
- **✅ 10-Point Habit Checklist**:
  - Phase A: Pre-Market Preparation (Sleep, Economic Calendar, Technical Warm-up).
  - Phase B: In-Session Execution (Max Risk Cap, Setup Wait, FOMO Discipline, Screen Breaks).
  - Phase C: Post-Market Review (Trade Logging, Performance Review, Market Disconnect).
- **💾 Dual-Mode Architecture**:
  - **Static / Cloud Mode (GitHub Pages / Netlify)**: Operates self-contained using client-side `localStorage`, requiring zero backend servers.
  - **Local Full-Stack Mode**: Runs with FastAPI and persistent SQLite database (`trading_journal.db`).
- **📥 CSV Data Export**:
  - RFC4180 compliant CSV export compatible with Excel, Google Sheets, and other analytical tools.

---

## 🌐 Deployments

### 1. GitHub Pages (Automated via GitHub Actions)
Every push to the `main` branch automatically deploys the frontend via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).
- **URL**: [https://yashdeokar.github.io/TradeJournal/](https://yashdeokar.github.io/TradeJournal/)

### 2. Netlify Deployment
TradeJournal includes native client-side storage persistence and `netlify.toml` out of the box.
- **URL**: [https://tradostats.netlify.app/](https://tradostats.netlify.app/)
- **Configuration**: Set publish directory to `frontend`.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.9+
- FastAPI, Uvicorn, Pandas

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yashdeokar/TradeJournal.git
   cd TradeJournal
   ```

2. **Install dependencies**:
   ```bash
   pip install fastapi uvicorn pandas
   ```

3. **Launch the server**:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```

4. Open your browser at **`http://127.0.0.1:8000`**.

---

## 📂 Project Structure

```
TradeJournal/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml  # Automatic GitHub Pages CI/CD workflow
├── backend/
│   ├── database.py           # SQLite database queries & schemas
│   └── main.py               # FastAPI REST API endpoints
├── frontend/
│   ├── app.js                # Frontend controller, state manager & storage adapter
│   └── index.html            # UI dashboard with Tailwind CSS, Plotly & Lucide icons
├── netlify.toml              # Netlify publish & rewrite configuration
├── trading_journal.db        # Local SQLite database
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation
```

---

## 📄 License
MIT License
