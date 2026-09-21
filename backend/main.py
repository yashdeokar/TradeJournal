from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Dict, Any
import io
import os
import uvicorn

import backend.database as db

app = FastAPI(title="TradeJournal API")

# Initialize DB on start
db.init_db()

# Pydantic input validation models matching the new schema
class JournalInput(BaseModel):
    date: str
    pnl: float
    pre_bias: str
    pre_levels: str
    pre_triggers: str
    post_wins: str
    post_mistakes: str
    post_psyche: str
    grade: str
    trading_plan: str = ""

class HabitsInput(BaseModel):
    date: str
    phase_a_sleep: bool
    phase_a_calendar: bool
    phase_a_warmup: bool
    phase_b_risk: bool
    phase_b_setup: bool
    phase_b_fomo: bool
    phase_b_breaks: bool
    phase_c_log: bool
    phase_c_review: bool
    phase_c_disconnect: bool

@app.get("/api/data")
async def get_data():
    """Returns all journal entries and associated habits."""
    try:
        data = db.get_all_data_list()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/journal")
async def save_journal(data: JournalInput):
    """Upserts a daily journal log."""
    try:
        db.save_journal_entry(
            date_str=data.date,
            pnl=data.pnl,
            pre_bias=data.pre_bias,
            pre_levels=data.pre_levels,
            pre_triggers=data.pre_triggers,
            post_wins=data.post_wins,
            post_mistakes=data.post_mistakes,
            post_psyche=data.post_psyche,
            grade=data.grade,
            trading_plan=data.trading_plan
        )
        return {"status": "success", "message": f"Saved journal entry for {data.date}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/habits")
async def save_habits(data: HabitsInput):
    """Upserts daily trading habits compliance checklist."""
    try:
        habits_dict = {
            "phase_a_sleep": data.phase_a_sleep,
            "phase_a_calendar": data.phase_a_calendar,
            "phase_a_warmup": data.phase_a_warmup,
            "phase_b_risk": data.phase_b_risk,
            "phase_b_setup": data.phase_b_setup,
            "phase_b_fomo": data.phase_b_fomo,
            "phase_b_breaks": data.phase_b_breaks,
            "phase_c_log": data.phase_c_log,
            "phase_c_review": data.phase_c_review,
            "phase_c_disconnect": data.phase_c_disconnect
        }
        db.save_habits_entry(date_str=data.date, habits_dict=habits_dict)
        
        # Ensure a minimal journal entry exists for this date so it appears in the joined dataset
        if not db.get_journal_entry(data.date):
            db.save_journal_entry(
                date_str=data.date, pnl=0.0,
                pre_bias="", pre_levels="", pre_triggers="",
                post_wins="", post_mistakes="", post_psyche="Calm",
                grade="A", trading_plan=""
            )
            
        return {"status": "success", "message": f"Saved habits entry for {data.date}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mock-data")
async def load_mock():
    """Generates 30 business days of mock trading logs."""
    try:
        db.load_mock_data()
        return {"status": "success", "message": "Loaded sample trading logs database"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
async def reset_db():
    """Resets the sqlite database table contents."""
    try:
        db.clear_database()
        return {"status": "success", "message": "Cleared database successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export")
async def export_csv():
    """Streams the database content as an RFC4180 CSV attachment stream."""
    try:
        df = db.get_csv_dataframe()
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = "attachment; filename=trading_journal.csv"
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Setup frontend static directory mount
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Serve index.html explicitly at root
@app.get("/")
async def serve_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend build files not found."}

# Mount static folder for app.js and stylesheet assets
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
