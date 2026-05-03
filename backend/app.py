from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import datetime

app = Flask(__name__)
CORS(app)

def init_db():
    conn = sqlite3.connect("data.db")
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            fall INTEGER,
            sos INTEGER,
            battery INTEGER,
            gsm INTEGER,
            time TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route("/api/device-data", methods=["POST"])
def device_data():
    data = request.json
    conn = sqlite3.connect("data.db")
    c = conn.cursor()

    c.execute("INSERT INTO logs (device_id, fall, sos, battery, gsm, time) VALUES (?, ?, ?, ?, ?, ?)", (
        data.get("device_id"),
        data.get("fall"),
        data.get("sos"),
        data.get("battery"),
        data.get("gsm"),
        datetime.datetime.now().strftime("%H:%M")
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

@app.route("/api/latest")
def latest():
    conn = sqlite3.connect("data.db")
    c = conn.cursor()

    c.execute("SELECT * FROM logs ORDER BY id DESC LIMIT 1")
    row = c.fetchone()

    conn.close()

    if row:
        return jsonify({
            "device_id": row[1],
            "fall": row[2],
            "sos": row[3],
            "battery": row[4],
            "gsm": row[5],
            "time": row[6]
        })
    return jsonify({"message": "no data"})

@app.route("/api/logs")
def logs():
    conn = sqlite3.connect("data.db")
    c = conn.cursor()

    c.execute("SELECT * FROM logs ORDER BY id DESC")
    rows = c.fetchall()

    conn.close()

    result = []
    for r in rows:
        result.append({
            "device_id": r[1],
            "fall": r[2],
            "sos": r[3],
            "battery": r[4],
            "gsm": r[5],
            "time": r[6]
        })

    return jsonify(result)

if __name__ == "__main__":
    app.run()