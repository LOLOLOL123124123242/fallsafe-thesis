from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import datetime

app = Flask(__name__)
CORS(app)

DB_NAME = "data.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            fall INTEGER,
            sos INTEGER,
            battery INTEGER,
            gsm INTEGER,
            time TEXT
        )
    """)

    conn.commit()
    conn.close()


init_db()


@app.route("/")
def home():
    return jsonify({
        "status": "FallSafe backend running",
        "endpoints": ["/api/device-data", "/api/latest", "/api/logs"]
    })


@app.route("/api/device-data", methods=["POST"])
def device_data():
    data = request.json

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        INSERT INTO logs (device_id, fall, sos, battery, gsm, time)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data.get("device_id", "ESP32-FD-001"),
        int(data.get("fall", 0)),
        int(data.get("sos", 0)),
        int(data.get("battery", 0)),
        int(data.get("gsm", 0)),
        now
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok", "time": now})


@app.route("/api/latest")
def latest():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM logs ORDER BY id DESC LIMIT 1")
    row = c.fetchone()

    conn.close()

    if not row:
        return jsonify({"message": "no data"})

    return jsonify({
        "id": row[0],
        "device_id": row[1],
        "fall": row[2],
        "sos": row[3],
        "battery": row[4],
        "gsm": row[5],
        "time": row[6]
    })


@app.route("/api/logs")
def logs():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM logs ORDER BY id DESC")
    rows = c.fetchall()

    conn.close()

    result = []

    for row in rows:
        result.append({
            "id": row[0],
            "device_id": row[1],
            "fall": row[2],
            "sos": row[3],
            "battery": row[4],
            "gsm": row[5],
            "time": row[6]
        })

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)