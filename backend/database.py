import sqlite3
import os
import pandas as pd
from datetime import datetime, timedelta
import random

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "trading_journal.db")

def get_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schemas for journal logs and habit logs with new detailed columns."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create daily journal table with separate columns for premium log structure
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS journal (
            date TEXT PRIMARY KEY,
            pnl REAL,
            pre_market_bias TEXT,
            pre_market_levels TEXT,
            pre_market_triggers TEXT,
            post_market_wins TEXT,
            post_market_mistakes TEXT,
            post_market_psyche TEXT,
            grade TEXT,
            trading_plan TEXT
        )
    """)
    
    # Check if trading_plan column exists in journal, if not alter the table
    cursor.execute("PRAGMA table_info(journal)")
    columns = [row[1] for row in cursor.fetchall()]
    if "trading_plan" not in columns:
        cursor.execute("ALTER TABLE journal ADD COLUMN trading_plan TEXT DEFAULT ''")
    
    # Create phase-based habits table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS habits (
            date TEXT PRIMARY KEY,
            phase_a_sleep INTEGER DEFAULT 0,
            phase_a_calendar INTEGER DEFAULT 0,
            phase_a_warmup INTEGER DEFAULT 0,
            phase_b_risk INTEGER DEFAULT 0,
            phase_b_setup INTEGER DEFAULT 0,
            phase_b_fomo INTEGER DEFAULT 0,
            phase_b_breaks INTEGER DEFAULT 0,
            phase_c_log INTEGER DEFAULT 0,
            phase_c_review INTEGER DEFAULT 0,
            phase_c_disconnect INTEGER DEFAULT 0
        )
    """)
    
    conn.commit()
    conn.close()

def get_journal_entry(date_str):
    """Retrieves a single daily journal entry by date."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM journal WHERE date = ?", (date_str,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_habits_entry(date_str):
    """Retrieves a single daily habits entry by date."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM habits WHERE date = ?", (date_str,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def save_journal_entry(date_str, pnl, pre_bias, pre_levels, pre_triggers, post_wins, post_mistakes, post_psyche, grade, trading_plan=""):
    """Saves or updates a daily journal entry."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO journal (
            date, pnl, pre_market_bias, pre_market_levels, pre_market_triggers,
            post_market_wins, post_market_mistakes, post_market_psyche, grade, trading_plan
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
            pnl = excluded.pnl,
            pre_market_bias = excluded.pre_market_bias,
            pre_market_levels = excluded.pre_market_levels,
            pre_market_triggers = excluded.pre_market_triggers,
            post_market_wins = excluded.post_market_wins,
            post_market_mistakes = excluded.post_market_mistakes,
            post_market_psyche = excluded.post_market_psyche,
            grade = excluded.grade,
            trading_plan = excluded.trading_plan
    """, (date_str, pnl, pre_bias, pre_levels, pre_triggers, post_wins, post_mistakes, post_psyche, grade, trading_plan))
    conn.commit()
    conn.close()

def save_habits_entry(date_str, habits_dict):
    """Saves or updates a daily habits entry."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO habits (
            date, phase_a_sleep, phase_a_calendar, phase_a_warmup,
            phase_b_risk, phase_b_setup, phase_b_fomo, phase_b_breaks,
            phase_c_log, phase_c_review, phase_c_disconnect
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
            phase_a_sleep = excluded.phase_a_sleep,
            phase_a_calendar = excluded.phase_a_calendar,
            phase_a_warmup = excluded.phase_a_warmup,
            phase_b_risk = excluded.phase_b_risk,
            phase_b_setup = excluded.phase_b_setup,
            phase_b_fomo = excluded.phase_b_fomo,
            phase_b_breaks = excluded.phase_b_breaks,
            phase_c_log = excluded.phase_c_log,
            phase_c_review = excluded.phase_c_review,
            phase_c_disconnect = excluded.phase_c_disconnect
    """, (
        date_str,
        int(habits_dict.get('phase_a_sleep', 0)),
        int(habits_dict.get('phase_a_calendar', 0)),
        int(habits_dict.get('phase_a_warmup', 0)),
        int(habits_dict.get('phase_b_risk', 0)),
        int(habits_dict.get('phase_b_setup', 0)),
        int(habits_dict.get('phase_b_fomo', 0)),
        int(habits_dict.get('phase_b_breaks', 0)),
        int(habits_dict.get('phase_c_log', 0)),
        int(habits_dict.get('phase_c_review', 0)),
        int(habits_dict.get('phase_c_disconnect', 0))
    ))
    conn.commit()
    conn.close()

def get_all_data_list():
    """Fetches all journal and habit logs joined together, sorted by date."""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT 
            j.date, j.pnl, j.pre_market_bias, j.pre_market_levels, j.pre_market_triggers,
            j.post_market_wins, j.post_market_mistakes, j.post_market_psyche, j.grade,
            j.trading_plan,
            h.phase_a_sleep, h.phase_a_calendar, h.phase_a_warmup,
            h.phase_b_risk, h.phase_b_setup, h.phase_b_fomo, h.phase_b_breaks,
            h.phase_c_log, h.phase_c_review, h.phase_c_disconnect
        FROM journal j
        LEFT JOIN habits h ON j.date = h.date
        ORDER BY j.date ASC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_csv_dataframe():
    """Returns all data as a pandas DataFrame for CSV export."""
    conn = get_connection()
    query = """
        SELECT 
            j.date, j.pnl, j.grade, 
            j.pre_market_bias, j.pre_market_levels, j.pre_market_triggers,
            j.trading_plan,
            j.post_market_wins, j.post_market_mistakes, j.post_market_psyche,
            h.phase_a_sleep, h.phase_a_calendar, h.phase_a_warmup,
            h.phase_b_risk, h.phase_b_setup, h.phase_b_fomo, h.phase_b_breaks,
            h.phase_c_log, h.phase_c_review, h.phase_c_disconnect
        FROM journal j
        LEFT JOIN habits h ON j.date = h.date
        ORDER BY j.date ASC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def clear_database():
    """Clears all records in the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM journal")
    cursor.execute("DELETE FROM habits")
    conn.commit()
    conn.close()

def load_mock_data():
    """Populates the database with 30 business days of highly detailed premium trading records."""
    clear_database()
    
    # Generate business days for the last 6 weeks (30 days total)
    today = datetime.now().date()
    dates = []
    current_date = today - timedelta(days=45)
    
    while current_date <= today and len(dates) < 30:
        if current_date.weekday() < 5:
            dates.append(current_date.strftime("%Y-%m-%d"))
        current_date += timedelta(days=1)
        
    biases = ["Bullish", "Bearish", "Neutral Range", "Highly Volatile Trend"]
    levels = ["SPY 445 Support, 452 Key Resistance", "QQQ 372 Gap Fill, 378 Daily High", "SPY 5100 Round Number Pivot", "Apple 175 Pivot Point"]
    triggers = ["5m Bull Flag Breakout at open", "VWAP rejection with high volume", "Opening Range Breakout (ORB) short", "Pullback to 20 EMA on 15m"]
    
    wins = ["Waited patiently for confirmation", "Scaled out at resistance targets", "Cut the losing trade at my technical level", "Accurately read the opening tape bid"]
    mistakes = ["None. Executed plan perfectly", "Slipped entry due to market order", "Took a trade outside levels out of boredom", "Let FOMO cause late chasing entry"]
    psyches = ["Calm", "Focused", "Excited", "Anxious", "Greedy"]
    
    conn = get_connection()
    cursor = conn.cursor()
    
    for i, date_str in enumerate(dates):
        # Premium seed parameters (Profitable expectancy, but realistic drawdowns)
        # Week 1: positive, Week 2: correction, Week 3-6: steady gain
        pnl_choice = random.random()
        is_win = pnl_choice < 0.62 # 62% win rate
        
        if is_win:
            pnl = round(random.uniform(200.0, 800.0), 2)
            grade = random.choices(["A", "B", "C"], weights=[0.65, 0.28, 0.07])[0]
        else:
            pnl = round(random.uniform(-150.0, -450.0), 2)
            grade = random.choices(["B", "C", "D", "F"], weights=[0.20, 0.40, 0.30, 0.10])[0]
            
        pre_bias = biases[i % len(biases)]
        pre_lvl = levels[i % len(levels)]
        pre_trig = triggers[i % len(triggers)]
        
        post_win = wins[i % len(wins)]
        post_mistake = mistakes[i % len(mistakes)]
        post_psy = psyches[i % len(psyches)]
        
        cursor.execute("""
            INSERT INTO journal (
                date, pnl, pre_market_bias, pre_market_levels, pre_market_triggers,
                post_market_wins, post_market_mistakes, post_market_psyche, grade, trading_plan
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (date_str, pnl, pre_bias, pre_lvl, pre_trig, post_win, post_mistake, post_psy, grade, ""))
        
        # Compliance probability based on rules grade
        compliance_prob = 0.92 if grade in ["A", "B"] else 0.50
        
        habits = {
            "phase_a_sleep": 1 if random.random() < compliance_prob else 0,
            "phase_a_calendar": 1 if random.random() < 0.95 else 0,
            "phase_a_warmup": 1 if random.random() < (compliance_prob - 0.05) else 0,
            "phase_b_risk": 1 if grade != "F" and random.random() < compliance_prob else 0,
            "phase_b_setup": 1 if grade not in ["D", "F"] and random.random() < compliance_prob else 0,
            "phase_b_fomo": 1 if grade not in ["D", "F"] and random.random() < compliance_prob else 0,
            "phase_b_breaks": 1 if is_win or random.random() < compliance_prob else 0,
            "phase_c_log": 1 if random.random() < 0.98 else 0,
            "phase_c_review": 1 if random.random() < compliance_prob else 0,
            "phase_c_disconnect": 1 if random.random() < (compliance_prob - 0.10) else 0,
        }
        
        cursor.execute("""
            INSERT INTO habits (
                date, phase_a_sleep, phase_a_calendar, phase_a_warmup,
                phase_b_risk, phase_b_setup, phase_b_fomo, phase_b_breaks,
                phase_c_log, phase_c_review, phase_c_disconnect
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            date_str,
            habits["phase_a_sleep"],
            habits["phase_a_calendar"],
            habits["phase_a_warmup"],
            habits["phase_b_risk"],
            habits["phase_b_setup"],
            habits["phase_b_fomo"],
            habits["phase_b_breaks"],
            habits["phase_c_log"],
            habits["phase_c_review"],
            habits["phase_c_disconnect"]
        ))
        
    conn.commit()
    conn.close()
