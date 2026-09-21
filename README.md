# 📈 TradeJournal - Professional Trading Journal & Habit Tracker

A modern, high-performance web application designed for active traders to document daily sessions, pre-market preparation, psychological state, execution mistakes, and strict trading habits compliance.

![TradeJournal](frontend/index.html)

---

## ✨ Features

- **📊 Interactive Analytics Dashboard**:
  - Net P&L metrics, Win/Loss ratios, Profit Factor, and Average Win vs. Loss.
  - Interactive Equity Growth Curve powered by Chart.js.
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
  - **Local Mode**: Runs with FastAPI and persistent SQLite database (`trading_journal.db`).
  - **Static / Netlify Mode**: Operates self-contained using client-side `localStorage`, requiring zero backend servers.
- **📥 CSV Data Export**:
  - RFC4180 compliant CSV export compatible with Excel, Google Sheets, and other analytical tools.

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

## 🌐 Deploying to Netlify

TradeJournal includes native client-side storage persistence and `netlify.toml` out of the box.

### One-Click GitHub + Netlify Integration (Recommended)
1. Push this repository to your **GitHub** account.
2. Go to [Netlify](https://app.netlify.com/) and click **"Add new site" > "Import an existing project"**.
3. Select **GitHub** and authorize your TradeJournal repository.
4. Netlify will automatically detect the settings:
   - **Publish directory**: `frontend`
5. Click **"Deploy site"**! Your trading journal will be live in seconds.

---

## 📂 Project Structure

```
TradeJournal/
├── backend/
│   ├── database.py       # SQLite database queries & schemas
│   └── main.py           # FastAPI REST API endpoints
├── frontend/
│   ├── app.js            # Frontend controller, state manager & storage adapter
│   └── index.html        # UI dashboard with Tailwind CSS & Lucide icons
├── netlify.toml          # Netlify publish & rewrite configuration
├── trading_journal.db    # Local SQLite database
├── .gitignore            # Git ignore rules
└── README.md             # Project documentation
```

---

## 📄 License
MIT License
