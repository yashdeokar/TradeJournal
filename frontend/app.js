// TraderJournal Frontend State Controller
let globalData = [];
let activeTab = "dashboard";
let calendarCurrentDate = new Date();
let selectedGrade = "A"; // Keeps track of currently selected grade card
const STORAGE_KEY = "tradejournal_local_data";
let isBackendAvailable = null;

// Realistic mock dataset generator for client-side / Netlify offline mode
function generateClientMockData() {
    const dates = [];
    const today = new Date();
    let current = new Date(today);
    current.setDate(current.getDate() - 45);
    
    while (current <= today && dates.length < 30) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Monday to Friday
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            dates.push(`${yyyy}-${mm}-${dd}`);
        }
        current.setDate(current.getDate() + 1);
    }
    
    const biases = ["Bullish", "Bearish", "Neutral Range", "Highly Volatile Trend"];
    const levels = ["SPY 445 Support, 452 Key Resistance", "QQQ 372 Gap Fill, 378 Daily High", "SPY 5100 Round Number Pivot", "Apple 175 Pivot Point"];
    const triggers = ["5m Bull Flag Breakout at open", "VWAP rejection with high volume", "Opening Range Breakout (ORB) short", "Pullback to 20 EMA on 15m"];
    const wins = ["Waited patiently for confirmation", "Scaled out at resistance targets", "Cut the losing trade at my technical level", "Accurately read the opening tape bid"];
    const mistakes = ["None. Executed plan perfectly", "Slipped entry due to market order", "Took a trade outside levels out of boredom", "Let FOMO cause late chasing entry"];
    const psyches = ["Calm", "Focused", "Excited", "Anxious", "Greedy"];
    
    const mockRecords = [];
    dates.forEach((dateStr, i) => {
        const isWin = Math.random() < 0.62;
        let pnl, grade;
        if (isWin) {
            pnl = Math.round((200 + Math.random() * 600) * 100) / 100;
            const r = Math.random();
            grade = r < 0.65 ? "A" : (r < 0.93 ? "B" : "C");
        } else {
            pnl = Math.round((-150 - Math.random() * 300) * 100) / 100;
            const r = Math.random();
            grade = r < 0.20 ? "B" : (r < 0.60 ? "C" : (r < 0.90 ? "D" : "F"));
        }
        
        const complianceProb = (grade === "A" || grade === "B") ? 0.92 : 0.50;
        
        mockRecords.push({
            date: dateStr,
            pnl: pnl,
            grade: grade,
            pre_market_bias: biases[i % biases.length],
            pre_market_levels: levels[i % levels.length],
            pre_market_triggers: triggers[i % triggers.length],
            trading_plan: "",
            post_market_wins: wins[i % wins.length],
            post_market_mistakes: mistakes[i % mistakes.length],
            post_market_psyche: psyches[i % psyches.length],
            phase_a_sleep: Math.random() < complianceProb ? 1 : 0,
            phase_a_calendar: Math.random() < 0.95 ? 1 : 0,
            phase_a_warmup: Math.random() < (complianceProb - 0.05) ? 1 : 0,
            phase_b_risk: grade !== "F" && Math.random() < complianceProb ? 1 : 0,
            phase_b_setup: grade !== "D" && grade !== "F" && Math.random() < complianceProb ? 1 : 0,
            phase_b_fomo: grade !== "D" && grade !== "F" && Math.random() < complianceProb ? 1 : 0,
            phase_b_breaks: isWin || Math.random() < complianceProb ? 1 : 0,
            phase_c_log: Math.random() < 0.98 ? 1 : 0,
            phase_c_review: Math.random() < complianceProb ? 1 : 0,
            phase_c_disconnect: Math.random() < (complianceProb - 0.10) ? 1 : 0
        });
    });
    
    mockRecords.sort((a, b) => a.date.localeCompare(b.date));
    return mockRecords;
}

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    // Set form dates to today by default
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("journal-date").value = todayStr;
    document.getElementById("habits-date").value = todayStr;
    
    // Load database and set view
    fetchData();
    lucide.createIcons();
});

// Navigate between views
function navigateTo(tabName) {
    activeTab = tabName;
    
    // Toggle active container
    const views = document.querySelectorAll(".page-view");
    views.forEach(view => {
        if (view.id === `page-${tabName}`) {
            view.classList.remove("hidden-view");
            view.classList.add("active-view");
        } else {
            view.classList.remove("active-view");
            view.classList.add("hidden-view");
        }
    });
    
    // Toggle active navbar buttons (desktop and mobile)
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
        if (btn.id === `nav-${tabName}`) {
            btn.classList.add("nav-btn-active");
            btn.classList.remove("text-slate-200", "hover:bg-white/10");
        } else {
            btn.classList.remove("nav-btn-active");
            btn.classList.add("text-slate-200", "hover:bg-white/10");
        }
    });
    
    // Mobile navigation coloring
    const mobBtns = ["mob-nav-dashboard", "mob-nav-journal", "mob-nav-habits", "mob-nav-data-management"];
    mobBtns.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === `mob-nav-${tabName}`) {
            el.classList.add("text-sky-400");
            el.classList.remove("text-slate-300");
        } else {
            el.classList.remove("text-sky-400");
            el.classList.add("text-slate-300");
        }
    });
    
    // Load relevant view resources
    if (tabName === "dashboard") {
        renderDashboard();
    } else if (tabName === "journal" || tabName === "habits") {
        loadDateData();
    } else if (tabName === "data-management") {
        renderTable();
    }
}

// Fetch database records (Dual-mode: connects to FastAPI backend if present, else uses localStorage)
async function fetchData() {
    try {
        if (isBackendAvailable === null) {
            try {
                const test = await fetch("/api/data", { method: "GET", cache: "no-store" });
                isBackendAvailable = test.ok;
            } catch (_) {
                isBackendAvailable = false;
            }
        }
        
        if (isBackendAvailable) {
            try {
                const response = await fetch("/api/data");
                if (response.ok) {
                    globalData = await response.json();
                    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData)); } catch (_) {}
                    navigateTo(activeTab);
                    return;
                }
            } catch (_) {
                isBackendAvailable = false;
            }
        }
        
        // Client-side / Netlify static fallback mode
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            try {
                globalData = JSON.parse(cached);
            } catch (_) {
                globalData = generateClientMockData();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData));
            }
        } else {
            globalData = generateClientMockData();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData));
        }
        
        navigateTo(activeTab);
    } catch (error) {
        showToast("❌ Failed to fetch journal records", "error");
        console.error("Fetch data error:", error);
    }
}

// Interactive Grade Selector click handler
function selectGrade(grade) {
    selectedGrade = grade;
    const grades = ["A", "B", "C", "D", "F"];
    grades.forEach(g => {
        const btn = document.getElementById(`grade-btn-${g}`);
        if (!btn) return;
        if (g === grade) {
            btn.classList.add("active-grade");
            // Add custom color border highlights
            if (g === 'A') btn.style.borderColor = "#34d399";
            else if (g === 'B') btn.style.borderColor = "#10b981";
            else if (g === 'C') btn.style.borderColor = "#059669";
            else if (g === 'D') btn.style.borderColor = "#a7f3d0";
            else if (g === 'F') btn.style.borderColor = "#f43f5e";
        } else {
            btn.classList.remove("active-grade");
            btn.style.borderColor = "rgba(255, 255, 255, 0.12)";
        }
    });
}

// Auto-populate form default values based on selected date
function loadDateData() {
    const journalDateInput = document.getElementById("journal-date");
    const habitsDateInput = document.getElementById("habits-date");
    
    // Synchronize selector dates across screens
    if (activeTab === "journal") {
        habitsDateInput.value = journalDateInput.value;
    } else if (activeTab === "habits") {
        journalDateInput.value = habitsDateInput.value;
    }
    
    const targetDate = journalDateInput.value;
    const record = globalData.find(item => item.date === targetDate);
    
    // Set Daily Journal inputs
    document.getElementById("journal-pnl").value = record ? record.pnl : "";
    document.getElementById("journal-bias").value = record ? record.pre_market_bias : "";
    document.getElementById("journal-levels").value = record ? record.pre_market_levels : "";
    document.getElementById("journal-triggers").value = record ? record.pre_market_triggers : "";
    document.getElementById("journal-plan").value = record ? (record.trading_plan || "") : getDefaultPlanTemplate();
    
    document.getElementById("journal-wins").value = record ? record.post_market_wins : "";
    document.getElementById("journal-mistakes").value = record ? record.post_market_mistakes : "";
    document.getElementById("journal-psyche").value = record ? record.post_market_psyche : "Calm";
    
    // Set Grade Card
    selectGrade(record ? record.grade : "A");
    
    // Set Habits checklist inputs
    const checklistKeys = [
        'phase_a_sleep', 'phase_a_calendar', 'phase_a_warmup',
        'phase_b_risk', 'phase_b_setup', 'phase_b_fomo', 'phase_b_breaks',
        'phase_c_log', 'phase_c_review', 'phase_c_disconnect'
    ];
    
    checklistKeys.forEach(k => {
        const suffix = k.split('_')[2]; // sleep, calendar, warmup, risk, setup, fomo, breaks, log, review, disconnect
        const chk = document.getElementById(`habit-${suffix}`);
        if (chk) {
            chk.checked = record ? !!record[k] : false;
        }
    });
}

// Save Daily Journal Entry form
async function submitJournalForm(e) {
    e.preventDefault();
    const payload = {
        date: document.getElementById("journal-date").value,
        pnl: parseFloat(document.getElementById("journal-pnl").value || 0),
        pre_bias: document.getElementById("journal-bias").value,
        pre_levels: document.getElementById("journal-levels").value,
        pre_triggers: document.getElementById("journal-triggers").value,
        trading_plan: document.getElementById("journal-plan").value,
        post_wins: document.getElementById("journal-wins").value,
        post_mistakes: document.getElementById("journal-mistakes").value,
        post_psyche: document.getElementById("journal-psyche").value,
        grade: selectedGrade
    };
    
    if (isBackendAvailable) {
        try {
            const response = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                showToast("📝 Daily log workspace saved!", "success");
                fetchData();
                return;
            }
        } catch (_) {
            isBackendAvailable = false;
        }
    }
    
    // Client-side save fallback
    const idx = globalData.findIndex(item => item.date === payload.date);
    if (idx >= 0) {
        globalData[idx] = {
            ...globalData[idx],
            pnl: payload.pnl,
            pre_market_bias: payload.pre_bias,
            pre_market_levels: payload.pre_levels,
            pre_market_triggers: payload.pre_triggers,
            trading_plan: payload.trading_plan,
            post_market_wins: payload.post_wins,
            post_market_mistakes: payload.post_mistakes,
            post_market_psyche: payload.post_psyche,
            grade: payload.grade
        };
    } else {
        globalData.push({
            date: payload.date,
            pnl: payload.pnl,
            pre_market_bias: payload.pre_bias,
            pre_market_levels: payload.pre_levels,
            pre_market_triggers: payload.pre_triggers,
            trading_plan: payload.trading_plan,
            post_market_wins: payload.post_wins,
            post_market_mistakes: payload.post_mistakes,
            post_market_psyche: payload.post_psyche,
            grade: payload.grade,
            phase_a_sleep: 0,
            phase_a_calendar: 0,
            phase_a_warmup: 0,
            phase_b_risk: 0,
            phase_b_setup: 0,
            phase_b_fomo: 0,
            phase_b_breaks: 0,
            phase_c_log: 0,
            phase_c_review: 0,
            phase_c_disconnect: 0
        });
        globalData.sort((a, b) => a.date.localeCompare(b.date));
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData)); } catch (_) {}
    showToast("📝 Daily log workspace saved!", "success");
    navigateTo(activeTab);
}

// Save Habits Checklist form
async function submitHabitsForm(e) {
    e.preventDefault();
    const payload = {
        date: document.getElementById("habits-date").value,
        phase_a_sleep: document.getElementById("habit-sleep").checked,
        phase_a_calendar: document.getElementById("habit-calendar").checked,
        phase_a_warmup: document.getElementById("habit-warmup").checked,
        phase_b_risk: document.getElementById("habit-risk").checked,
        phase_b_setup: document.getElementById("habit-setup").checked,
        phase_b_fomo: document.getElementById("habit-fomo").checked,
        phase_b_breaks: document.getElementById("habit-breaks").checked,
        phase_c_log: document.getElementById("habit-log").checked,
        phase_c_review: document.getElementById("habit-review").checked,
        phase_c_disconnect: document.getElementById("habit-disconnect").checked
    };
    
    if (isBackendAvailable) {
        try {
            const response = await fetch("/api/habits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                showToast("🔄 Routine checklist saved!", "success");
                fetchData();
                return;
            }
        } catch (_) {
            isBackendAvailable = false;
        }
    }
    
    // Client-side save fallback
    const idx = globalData.findIndex(item => item.date === payload.date);
    if (idx >= 0) {
        globalData[idx] = {
            ...globalData[idx],
            phase_a_sleep: payload.phase_a_sleep ? 1 : 0,
            phase_a_calendar: payload.phase_a_calendar ? 1 : 0,
            phase_a_warmup: payload.phase_a_warmup ? 1 : 0,
            phase_b_risk: payload.phase_b_risk ? 1 : 0,
            phase_b_setup: payload.phase_b_setup ? 1 : 0,
            phase_b_fomo: payload.phase_b_fomo ? 1 : 0,
            phase_b_breaks: payload.phase_b_breaks ? 1 : 0,
            phase_c_log: payload.phase_c_log ? 1 : 0,
            phase_c_review: payload.phase_c_review ? 1 : 0,
            phase_c_disconnect: payload.phase_c_disconnect ? 1 : 0
        };
    } else {
        globalData.push({
            date: payload.date,
            pnl: 0,
            pre_market_bias: "",
            pre_market_levels: "",
            pre_market_triggers: "",
            trading_plan: "",
            post_market_wins: "",
            post_market_mistakes: "",
            post_market_psyche: "Calm",
            grade: "A",
            phase_a_sleep: payload.phase_a_sleep ? 1 : 0,
            phase_a_calendar: payload.phase_a_calendar ? 1 : 0,
            phase_a_warmup: payload.phase_a_warmup ? 1 : 0,
            phase_b_risk: payload.phase_b_risk ? 1 : 0,
            phase_b_setup: payload.phase_b_setup ? 1 : 0,
            phase_b_fomo: payload.phase_b_fomo ? 1 : 0,
            phase_b_breaks: payload.phase_b_breaks ? 1 : 0,
            phase_c_log: payload.phase_c_log ? 1 : 0,
            phase_c_review: payload.phase_c_review ? 1 : 0,
            phase_c_disconnect: payload.phase_c_disconnect ? 1 : 0
        });
        globalData.sort((a, b) => a.date.localeCompare(b.date));
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData)); } catch (_) {}
    showToast("🔄 Routine checklist saved!", "success");
    navigateTo(activeTab);
}

// Render Dashboard (Metrics, Charts, Calendar)
function renderDashboard() {
    const journalLogs = globalData.filter(item => item.pnl !== null);
    
    if (journalLogs.length === 0) {
        // Empty state configs
        document.getElementById("metric-avg-winloss").textContent = "$0.00 / $0.00";
        document.getElementById("badge-ratio").textContent = "0.00x";
        document.getElementById("metric-profit-factor").textContent = "0.00";
        document.getElementById("metric-streaks").textContent = "0 W / 0 L";
        document.getElementById("metric-habits").textContent = "0.0%";
        document.getElementById("metric-habits-sub").textContent = "0 / 0 Checkpoints completed";
        
        const chartEquityEl = document.getElementById("chart-equity");
        if (chartEquityEl) {
            chartEquityEl.innerHTML = `<div class="text-slate-500 text-sm flex items-center justify-center h-full">Log entries to view Equity Curve</div>`;
        }
        const chartGradesEl = document.getElementById("chart-grades");
        if (chartGradesEl) {
            chartGradesEl.innerHTML = `<div class="text-slate-500 text-sm flex items-center justify-center h-full">Log entries to view Rule Adherence</div>`;
        }
        
        renderScoreTriangle(0, 0, 0);
        renderCustomCalendar();
        return;
    }
    
    // Sort logs by date ascending
    const sortedLogs = [...journalLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 1. Calculate KPI Metrics
    const nonZeroLogs = sortedLogs.filter(item => item.pnl !== 0);
    const winLogs = nonZeroLogs.filter(item => item.pnl > 0);
    const lossLogs = nonZeroLogs.filter(item => item.pnl < 0);
    
    const grossProfits = winLogs.reduce((sum, item) => sum + item.pnl, 0);
    const grossLosses = absVal(lossLogs.reduce((sum, item) => sum + item.pnl, 0));
    
    const avgWin = winLogs.length > 0 ? (grossProfits / winLogs.length) : 0;
    const avgLoss = lossLogs.length > 0 ? (grossLosses / lossLogs.length) : 0;
    
    const winLossRatio = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? 5.0 : 0.0);
    const profitFactor = grossLosses > 0 ? (grossProfits / grossLosses) : (grossProfits > 0 ? 5.0 : 1.0);
    
    // Streak calculations
    const streakResult = calculateDetailedStreaks(sortedLogs);
    
    // Win Rate %
    const winRate = nonZeroLogs.length > 0 ? (winLogs.length / nonZeroLogs.length * 100) : 0;
    
    // Habit compliance score
    const habitCols = [
        'phase_a_sleep', 'phase_a_calendar', 'phase_a_warmup',
        'phase_b_risk', 'phase_b_setup', 'phase_b_fomo', 'phase_b_breaks',
        'phase_c_log', 'phase_c_review', 'phase_c_disconnect'
    ];
    let habitsChecked = 0;
    let habitsPossible = 0;
    globalData.forEach(item => {
        habitCols.forEach(col => {
            if (item[col] !== undefined && item[col] !== null) {
                habitsChecked += item[col];
                habitsPossible += 1;
            }
        });
    });
    const habitRate = habitsPossible > 0 ? (habitsChecked / habitsPossible * 100) : 0;
    
    // 2. Set KPI HTML text
    // Avg Win/Loss
    document.getElementById("metric-avg-winloss").textContent = 
        `$${Math.round(avgWin).toLocaleString()} / -$${Math.round(avgLoss).toLocaleString()}`;
    
    const ratioBadge = document.getElementById("badge-ratio");
    ratioBadge.textContent = `${winLossRatio.toFixed(2)}x`;
    if (winLossRatio >= 1.5) {
        ratioBadge.style.backgroundColor = "rgba(52, 211, 153, 0.25)";
        ratioBadge.style.color = "#34d399";
        ratioBadge.style.borderColor = "rgba(52, 211, 153, 0.4)";
    } else if (winLossRatio >= 1.0) {
        ratioBadge.style.backgroundColor = "rgba(245, 158, 11, 0.25)";
        ratioBadge.style.color = "#fbbf24";
        ratioBadge.style.borderColor = "rgba(245, 158, 11, 0.4)";
    } else {
        ratioBadge.style.backgroundColor = "rgba(244, 63, 94, 0.25)";
        ratioBadge.style.color = "#f87171";
        ratioBadge.style.borderColor = "rgba(244, 63, 94, 0.4)";
    }
    
    // Profit Factor
    document.getElementById("metric-profit-factor").textContent = profitFactor >= 5 ? "∞" : profitFactor.toFixed(2);
    const pfSub = document.getElementById("metric-profit-factor-sub");
    if (profitFactor >= 1.5) {
        pfSub.textContent = "High Profit Expectancy";
        pfSub.style.color = "#34d399";
    } else if (profitFactor >= 1.0) {
        pfSub.textContent = "Breakeven / Growth Spectrum";
        pfSub.style.color = "#fbbf24";
    } else {
        pfSub.textContent = "Negative Performance Edge";
        pfSub.style.color = "#f87171";
    }
    
    // Streaks
    document.getElementById("metric-streaks").textContent = streakResult.current;
    document.getElementById("metric-streaks").style.color = streakResult.color === "green" ? "#34d399" : "#f87171";
    document.getElementById("streak-icon").textContent = streakResult.emoji;
    document.getElementById("metric-streaks-sub").textContent = `Max: ${streakResult.max}`;
    
    // Habit Consistent
    document.getElementById("metric-habits").textContent = `${habitRate.toFixed(1)}%`;
    document.getElementById("metric-habits-sub").textContent = `${habitsChecked} / ${habitsPossible} checkpoints met`;
    
    // 3. Plot Equity Curve (Plotly.js)
    let cumulativePnl = 0;
    const equityDates = [];
    const equityValues = [];
    
    sortedLogs.forEach(item => {
        cumulativePnl += item.pnl;
        equityDates.push(item.date);
        equityValues.push(cumulativePnl);
    });
    
    const isPnlProfitable = cumulativePnl >= 0;
    const lineThemeColor = isPnlProfitable ? "#34d399" : "#f43f5e";
    const fillThemeColor = isPnlProfitable ? "rgba(52, 211, 153, 0.08)" : "rgba(244, 63, 94, 0.08)";
    
    const equityTrace = {
        x: equityDates,
        y: equityValues,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: lineThemeColor, width: 3, shape: 'spline' },
        marker: { size: 5, color: lineThemeColor },
        fill: 'tozeroy',
        fillcolor: fillThemeColor,
        hovertemplate: '<b>Date:</b> %{x}<br><b>Equity:</b> $%{y:,.2f}<extra></extra>'
    };
    
    const chartLayout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 45, r: 10, t: 15, b: 35 },
        xaxis: {
            gridcolor: 'rgba(255, 255, 255, 0.06)',
            tickfont: { color: '#e2e8f0', family: 'Plus Jakarta Sans', size: 10 },
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            gridcolor: 'rgba(255, 255, 255, 0.06)',
            tickfont: { color: '#e2e8f0', family: 'Plus Jakarta Sans', size: 10 },
            showgrid: true,
            zeroline: true,
            zerolinecolor: 'rgba(255, 255, 255, 0.15)'
        }
    };
    
    const chartEquityEl = document.getElementById("chart-equity");
    if (chartEquityEl) {
        Plotly.newPlot("chart-equity", [equityTrace], chartLayout, { displayModeBar: false, responsive: true });
    }
    
    // 4. Plot Rule Adherence grades donut
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    sortedLogs.forEach(item => {
        if (gradeCounts[item.grade] !== undefined) {
            gradeCounts[item.grade]++;
        }
    });
    
    const gradesTrace = {
        values: Object.values(gradeCounts),
        labels: Object.keys(gradeCounts),
        type: 'pie',
        hole: 0.5,
        marker: {
            colors: ['#34d399', '#10b981', '#059669', '#047857', '#f87171']
        },
        textinfo: 'label+percent',
        textposition: 'inside',
        insidetextorientation: 'radial',
        hoverinfo: 'label+value',
        showlegend: false
    };
    
    const gradesLayout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 20, r: 20, t: 20, b: 20 },
        textfont: { color: '#ffffff', family: 'Plus Jakarta Sans', size: 11 }
    };
    
    const chartGradesEl = document.getElementById("chart-grades");
    if (chartGradesEl) {
        Plotly.newPlot("chart-grades", [gradesTrace], gradesLayout, { displayModeBar: false, responsive: true });
    }
    
    // 5. Render Score Triangle (Custom SVG)
    renderScoreTriangle(winRate, profitFactor, winLossRatio);
    
    // 6. Render outcomes calendar
    renderCustomCalendar();
}

// Calculate streaks
function calculateDetailedStreaks(sortedLogs) {
    const activePnls = sortedLogs.filter(item => item.pnl !== 0).map(item => item.pnl);
    if (activePnls.length === 0) return { current: "0 W", max: "0 W / 0 L", color: "neutral", emoji: "🔥" };
    
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempWin = 0;
    let tempLoss = 0;
    
    activePnls.forEach(pnl => {
        if (pnl > 0) {
            tempWin++;
            if (tempWin > maxWinStreak) maxWinStreak = tempWin;
            tempLoss = 0;
        } else if (pnl < 0) {
            tempLoss++;
            if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
            tempWin = 0;
        }
    });
    
    const reversePnls = [...activePnls].reverse();
    const lastPnl = reversePnls[0];
    const lastIsWin = lastPnl > 0;
    
    let currentCount = 0;
    for (let p of reversePnls) {
        if (lastIsWin && p > 0) {
            currentCount++;
        } else if (!lastIsWin && p < 0) {
            currentCount++;
        } else {
            break;
        }
    }
    
    return {
        current: `${currentCount} ${lastIsWin ? 'W' : 'L'}`,
        max: `${maxWinStreak} W / ${maxLossStreak} L`,
        color: lastIsWin ? "green" : "red",
        emoji: lastIsWin ? "🔥" : "❄️"
    };
}

// Custom Triangle Chart Generator (SVG injection)
function renderScoreTriangle(winRate, profitFactor, winLossRatio) {
    const container = document.getElementById("chart-triangle");
    if (!container) return;
    
    // Normalization bounds (Target caps where 1.0 is full edge)
    const normWinRate = Math.min(winRate / 75.0, 1.0); // 75% winrate max
    const normPF = Math.min(profitFactor / 3.0, 1.0); // 3.0 PF max
    const normRatio = Math.min(winLossRatio / 3.0, 1.0); // 3.0 RR max
    
    const cx = 140;
    const cy = 130;
    const maxR = 85;
    
    // Axis Vertices Angles (WinRate = 90 deg up, PF = 330 deg, RR = 210 deg)
    const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];
    
    // Calculate $(x, y)$ coordinate function
    const getPoint = (rVal, angleIdx) => {
        const r = rVal * maxR;
        return {
            x: cx + r * Math.cos(angles[angleIdx]),
            y: cy + r * Math.sin(angles[angleIdx])
        };
    };
    
    // Inner guideline grids (25%, 50%, 75%, 100%)
    let guidelines = "";
    [0.25, 0.5, 0.75, 1.0].forEach(scale => {
        const pt1 = getPoint(scale, 0);
        const pt2 = getPoint(scale, 1);
        const pt3 = getPoint(scale, 2);
        guidelines += `<polygon points="${pt1.x},${pt1.y} ${pt2.x},${pt2.y} ${pt3.x},${pt3.y}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" ${scale === 1.0 ? '' : 'stroke-dasharray="2,2"'} />`;
    });
    
    // Axis guidelines lines from center to corners
    let axesLines = "";
    for (let i = 0; i < 3; i++) {
        const outer = getPoint(1.0, i);
        axesLines += `<line x1="${cx}" y1="${cy}" x2="${outer.x}" y2="${outer.y}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" />`;
    }
    
    // User Performance Triangle Vertices
    const userPt1 = getPoint(Math.max(normWinRate, 0.1), 0);
    const userPt2 = getPoint(Math.max(normPF, 0.1), 1);
    const userPt3 = getPoint(Math.max(normRatio, 0.1), 2);
    
    const svgContent = `
    <svg width="280" height="250" viewBox="0 0 280 250" class="select-none">
        <defs>
            <radialGradient id="glassGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(52, 211, 153, 0.2)" />
                <stop offset="100%" stop-color="rgba(52, 211, 153, 0.0)" />
            </radialGradient>
        </defs>
        
        <!-- Guidelines Grid -->
        ${guidelines}
        ${axesLines}
        
        <!-- User Edge Polygon -->
        <polygon points="${userPt1.x},${userPt1.y} ${userPt2.x},${userPt2.y} ${userPt3.x},${userPt3.y}" 
            fill="url(#glassGlow)" 
            stroke="#34d399" 
            stroke-width="2.5" 
            class="svg-glow" />
            
        <!-- Glowing Vertices Points -->
        <circle cx="${userPt1.x}" cy="${userPt1.y}" r="4" fill="#34d399" />
        <circle cx="${userPt2.x}" cy="${userPt2.y}" r="4" fill="#34d399" />
        <circle cx="${userPt3.x}" cy="${userPt3.y}" r="4" fill="#34d399" />
        
        <!-- Label Tags -->
        <text x="${cx}" y="${cy - maxR - 10}" fill="#cbd5e1" font-size="10" font-weight="bold" text-anchor="middle" font-family="Plus Jakarta Sans">WIN RATE (${winRate.toFixed(1)}%)</text>
        <text x="${cx + maxR + 5}" y="${cy + maxR - 35}" fill="#cbd5e1" font-size="10" font-weight="bold" text-anchor="start" font-family="Plus Jakarta Sans">PROFIT FACTOR (${profitFactor.toFixed(2)})</text>
        <text x="${cx - maxR - 5}" y="${cy + maxR - 35}" fill="#cbd5e1" font-size="10" font-weight="bold" text-anchor="end" font-family="Plus Jakarta Sans">W/L RATIO (${winLossRatio.toFixed(2)}x)</text>
    </svg>
    `;
    container.innerHTML = svgContent;
}

// Custom calendar builder
function renderCustomCalendar() {
    const grid = document.getElementById("calendar-days-grid");
    grid.innerHTML = "";
    
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("calendar-month-label").textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    let startDayIdx = firstDay.getDay() - 1; // Align Mon = 0
    if (startDayIdx < 0) startDayIdx = 6;
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Pad placeholders
    for (let i = 0; i < startDayIdx; i++) {
        const pad = document.createElement("div");
        pad.className = "bg-white/2 rounded-xl border border-white/5 opacity-20 aspect-square";
        grid.appendChild(pad);
    }
    
    const recordMap = {};
    globalData.forEach(item => {
        recordMap[item.date] = item;
    });
    
    for (let day = 1; day <= totalDays; day++) {
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = recordMap[cellDateStr];
        
        const cell = document.createElement("div");
        cell.className = "calendar-cell bg-white/2 rounded-xl border border-white/10 p-2 md:p-3 flex flex-col justify-between text-left cursor-pointer hover:border-slate-400 min-h-[50px] md:min-h-[70px] shadow-sm";
        
        const dateNum = document.createElement("span");
        dateNum.className = "text-slate-400 font-bold text-xs";
        dateNum.textContent = day;
        cell.appendChild(dateNum);
        
        if (record && record.pnl !== null) {
            const pnl = record.pnl;
            const pnlLabel = document.createElement("span");
            pnlLabel.className = "text-[9px] md:text-[11px] font-extrabold mt-1 md:mt-2 truncate w-full";
            
            if (pnl > 0) {
                cell.classList.add("bg-brandGreen/10", "border-brandGreen/30");
                pnlLabel.classList.add("text-brandGreen");
                pnlLabel.textContent = `+$${Math.round(pnl)}`;
            } else if (pnl < 0) {
                cell.classList.add("bg-brandRed/10", "border-brandRed/30");
                pnlLabel.classList.add("text-brandRed");
                pnlLabel.textContent = `-$${Math.round(Math.abs(pnl))}`;
            } else {
                cell.classList.add("bg-white/5", "border-white/15");
                pnlLabel.classList.add("text-slate-450");
                pnlLabel.textContent = `$0`;
            }
            cell.appendChild(pnlLabel);
            
            cell.onclick = () => showDetailsModal(cellDateStr, record);
        } else {
            cell.onclick = () => {
                document.getElementById("journal-date").value = cellDateStr;
                document.getElementById("habits-date").value = cellDateStr;
                loadDateData();
                navigateTo('journal');
            };
        }
        
        grid.appendChild(cell);
    }
}

// Adjust calendar month
function changeCalendarMonth(offset) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + offset);
    renderCustomCalendar();
}

// Modal Detail window
function showDetailsModal(dateStr, record) {
    const modal = document.getElementById("details-modal");
    const container = document.getElementById("modal-container");
    
    document.getElementById("modal-title").textContent = `Details for Session ${dateStr}`;
    
    const pnlEl = document.getElementById("modal-pnl");
    pnlEl.textContent = (record.pnl >= 0 ? "+" : "-") + `$${Math.abs(record.pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    pnlEl.style.color = record.pnl >= 0 ? "#34d399" : "#f43f5e";
    
    const gradeEl = document.getElementById("modal-grade");
    gradeEl.textContent = `GRADE ${record.grade}`;
    gradeEl.className = "grade-badge grade-" + record.grade;
    
    // Set split fields inside details
    document.getElementById("modal-bias").textContent = record.pre_market_bias || "-";
    document.getElementById("modal-levels").textContent = record.pre_market_levels || "-";
    document.getElementById("modal-triggers").textContent = record.pre_market_triggers || "-";
    document.getElementById("modal-plan").textContent = record.trading_plan || "No detailed plan logged for this session.";
    
    document.getElementById("modal-wins").textContent = record.post_market_wins || "-";
    document.getElementById("modal-mistakes").textContent = record.post_market_mistakes || "-";
    document.getElementById("modal-psyche").textContent = record.post_market_psyche || "-";
    
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        container.classList.remove("scale-95");
    }, 10);
}

function closeDetailsModal() {
    const modal = document.getElementById("details-modal");
    const container = document.getElementById("modal-container");
    
    modal.classList.add("opacity-0");
    container.classList.add("scale-95");
    setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }, 250);
}

// Data Management: Render Table Grid
function renderTable() {
    const tbody = document.getElementById("db-table-body");
    const emptyState = document.getElementById("table-empty-state");
    
    tbody.innerHTML = "";
    
    if (globalData.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }
    
    emptyState.classList.add("hidden");
    
    const sortedData = [...globalData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedData.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-white/5 hover:bg-white/5 text-slate-300 font-medium transition-colors cursor-pointer";
        tr.onclick = () => {
            document.getElementById("journal-date").value = row.date;
            document.getElementById("habits-date").value = row.date;
            loadDateData();
            navigateTo("journal");
        };
        
        const pnlFormatted = row.pnl !== null 
            ? (row.pnl >= 0 ? "+" : "-") + `$${Math.abs(row.pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : "$0.00";
            
        const pnlColorClass = row.pnl > 0 ? "text-brandGreen" : (row.pnl < 0 ? "text-brandRed" : "text-slate-400");
        
        tr.innerHTML = `
            <td class="py-3 px-3 font-semibold text-slate-200">${row.date}</td>
            <td class="py-3 px-3 font-bold ${pnlColorClass}">${pnlFormatted}</td>
            <td class="py-3 px-3"><span class="grade-badge grade-${row.grade || 'A'}">${row.grade || 'A'}</span></td>
            <td class="py-3 px-3 truncate max-w-[150px] text-slate-400 font-semibold">${row.pre_market_bias || '-'}</td>
            <td class="py-3 px-3 truncate max-w-[150px] text-slate-400 font-semibold">${row.post_market_psyche || '-'}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Table Client Filtering
function filterTable() {
    const query = document.getElementById("db-search").value.toLowerCase();
    const rows = document.querySelectorAll("#db-table-body tr");
    let visibleCount = 0;
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });
    
    const emptyState = document.getElementById("table-empty-state");
    if (visibleCount === 0) {
        emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");
    }
}

// Helper absolute values
function absVal(v) { return Math.abs(v); }

// Actions: Trigger DB Purge Reset
async function triggerDbReset() {
    if (!confirm("⚠️ Danger: Are you sure you want to delete ALL journal entries and habits? This cannot be undone.")) return;
    
    if (isBackendAvailable) {
        try {
            const res = await fetch("/api/reset", { method: "POST" });
            if (res.ok) {
                globalData = [];
                try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
                showToast("🗑️ Database wiped clean", "success");
                fetchData();
                return;
            }
        } catch (_) {
            isBackendAvailable = false;
        }
    }
    
    globalData = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    showToast("🗑️ Database wiped clean", "success");
    navigateTo(activeTab);
}

// Actions: Trigger Mock Generator
async function triggerMockData() {
    if (isBackendAvailable) {
        try {
            const res = await fetch("/api/mock-data", { method: "POST" });
            if (res.ok) {
                showToast("🚀 Mock data injected successfully!", "success");
                fetchData();
                return;
            }
        } catch (_) {
            isBackendAvailable = false;
        }
    }
    
    globalData = generateClientMockData();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData)); } catch (_) {}
    showToast("🚀 Mock data injected successfully!", "success");
    navigateTo(activeTab);
}

// Client-Side CSV Export (Works everywhere including Netlify & offline)
function exportCSV() {
    if (!globalData || globalData.length === 0) {
        showToast("⚠️ No records to export", "error");
        return;
    }
    
    const headers = [
        "date", "pnl", "grade",
        "pre_market_bias", "pre_market_levels", "pre_market_triggers",
        "trading_plan",
        "post_market_wins", "post_market_mistakes", "post_market_psyche",
        "phase_a_sleep", "phase_a_calendar", "phase_a_warmup",
        "phase_b_risk", "phase_b_setup", "phase_b_fomo", "phase_b_breaks",
        "phase_c_log", "phase_c_review", "phase_c_disconnect"
    ];
    
    const rows = [headers.join(",")];
    
    globalData.forEach(row => {
        const line = headers.map(h => {
            let val = row[h] !== undefined && row[h] !== null ? row[h] : "";
            val = String(val).replace(/"/g, '""');
            if (val.search(/("|,|\n)/g) >= 0) {
                val = `"${val}"`;
            }
            return val;
        });
        rows.push(line.join(","));
    });
    
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "trading_journal.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("📥 Exported trading_journal.csv", "success");
}

// UI Alert Toasts
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const icon = document.getElementById("toast-icon");
    const msg = document.getElementById("toast-message");
    
    icon.textContent = type === "success" ? "✅" : (type === "error" ? "❌" : "⚠️");
    msg.textContent = message;
    
    toast.classList.remove("translate-y-20", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
    
    setTimeout(() => {
        toast.classList.add("translate-y-20", "opacity-0");
        toast.classList.remove("translate-y-0", "opacity-100");
    }, 3000);
}

// Default pre-market session plan template (Header + Footer)
function getDefaultPlanTemplate() {
    return `=== 🌅 PRE-MARKET SESSION PLAN ===

Focus Asset: [e.g., SPY, QQQ, TSLA]
Daily Goal: [e.g., Wait for key levels, max 2 trades]

Key Levels of Interest:
- Support: 
- Resistance: 

Tactical Setup Triggers:
1. 
2. 

=== 🌄 SESSION COMPLIANCE FOOTER ===
Max Daily Risk Cap: $
Stop-Loss Protocol: Set immediately on entry`;
}
