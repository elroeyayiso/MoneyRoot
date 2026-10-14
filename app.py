from flask import Flask, request, jsonify, session, send_from_directory

import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "moneyroot.db"

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")
app.secret_key = os.environ.get("MONEYROOT_SECRET_KEY", "moneyroot-local-development-secret-change-me")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"


def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            target REAL NOT NULL,
            current REAL DEFAULT 0,
            monthly REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS debts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            balance REAL NOT NULL,
            apr REAL DEFAULT 0,
            minimum REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    db.commit()
    db.close()


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "You must be logged in."}), 401
        return function(*args, **kwargs)
    return wrapper


@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/dashboard")
def dashboard():
    return send_from_directory(BASE_DIR, "dashboard.html")


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Please fill in all fields."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        db.close()
        return jsonify({"error": "An account with this email already exists."}), 400

    password_hash = generate_password_hash(password)
    cursor = db.execute(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        (name, email, password_hash),
    )
    user_id = cursor.lastrowid
    db.commit()
    db.close()

    session.clear()
    session["user_id"] = user_id
    session["name"] = name
    session["email"] = email

    return jsonify({
        "message": "Account created successfully.",
        "user": {"id": user_id, "name": name, "email": email},
    })


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    db.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Email or password is incorrect."}), 401

    session.clear()
    session["user_id"] = user["id"]
    session["name"] = user["name"]
    session["email"] = user["email"]

    return jsonify({
        "message": "Logged in successfully.",
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    })


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."})


@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False})
    return jsonify({
        "logged_in": True,
        "user": {
            "id": session["user_id"],
            "name": session["name"],
            "email": session["email"],
        },
    })


# ---------- Transactions ----------
@app.route("/api/transactions", methods=["GET"])
@login_required
def get_transactions():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
        (session["user_id"],),
    ).fetchall()
    db.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/transactions", methods=["POST"])
@login_required
def save_transaction():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    amount = data.get("amount")
    transaction_type = data.get("type")
    category = data.get("category", "Other")
    date = data.get("date", "")
    transaction_id = data.get("id")

    if not name or amount is None or transaction_type not in ["income", "expense"] or not date:
        return jsonify({"error": "Invalid transaction."}), 400

    db = get_db()
    if transaction_id:
        cursor = db.execute(
            """UPDATE transactions SET name=?, amount=?, type=?, category=?, date=?
               WHERE id=? AND user_id=?""",
            (name, amount, transaction_type, category, date, transaction_id, session["user_id"]),
        )
        if cursor.rowcount == 0:
            db.close()
            return jsonify({"error": "Transaction not found."}), 404
        saved_id = transaction_id
    else:
        cursor = db.execute(
            """INSERT INTO transactions (user_id, name, amount, type, category, date)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session["user_id"], name, amount, transaction_type, category, date),
        )
        saved_id = cursor.lastrowid

    db.commit()
    row = db.execute("SELECT * FROM transactions WHERE id=? AND user_id=?", (saved_id, session["user_id"])).fetchone()
    db.close()
    return jsonify(dict(row))


@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
@login_required
def delete_transaction(transaction_id):
    db = get_db()
    db.execute("DELETE FROM transactions WHERE id=? AND user_id=?", (transaction_id, session["user_id"]))
    db.commit()
    db.close()
    return jsonify({"message": "Transaction deleted."})


# ---------- Budgets ----------
@app.route("/api/budgets", methods=["GET"])
@login_required
def get_budgets():
    db = get_db()
    rows = db.execute("SELECT * FROM budgets WHERE user_id=? ORDER BY id DESC", (session["user_id"],)).fetchall()
    db.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/budgets", methods=["POST"])
@login_required
def save_budget():
    data = request.get_json(silent=True) or {}
    name = str(data.get("category") or data.get("name") or "").strip()
    amount = data.get("amount")
    budget_id = data.get("id")
    if not name or amount is None:
        return jsonify({"error": "Invalid budget."}), 400

    db = get_db()
    if budget_id:
        cursor = db.execute("UPDATE budgets SET name=?, amount=? WHERE id=? AND user_id=?", (name, amount, budget_id, session["user_id"]))
        if cursor.rowcount == 0:
            db.close()
            return jsonify({"error": "Budget not found."}), 404
        saved_id = budget_id
    else:
        cursor = db.execute("INSERT INTO budgets (user_id, name, amount) VALUES (?, ?, ?)", (session["user_id"], name, amount))
        saved_id = cursor.lastrowid
    db.commit()
    row = db.execute("SELECT * FROM budgets WHERE id=? AND user_id=?", (saved_id, session["user_id"])).fetchone()
    db.close()
    return jsonify(dict(row))


@app.route("/api/budgets/<int:budget_id>", methods=["DELETE"])
@login_required
def delete_budget(budget_id):
    db = get_db()
    db.execute("DELETE FROM budgets WHERE id=? AND user_id=?", (budget_id, session["user_id"]))
    db.commit()
    db.close()
    return jsonify({"message": "Budget deleted."})


# ---------- Goals ----------
@app.route("/api/goals", methods=["GET"])
@login_required
def get_goals():
    db = get_db()
    rows = db.execute("SELECT * FROM goals WHERE user_id=? ORDER BY id DESC", (session["user_id"],)).fetchall()
    db.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/goals", methods=["POST"])
@login_required
def save_goal():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    target = data.get("target")
    current = data.get("current", 0)
    monthly = data.get("monthly", 0)
    goal_id = data.get("id")
    if not name or target is None:
        return jsonify({"error": "Invalid goal."}), 400

    db = get_db()
    if goal_id:
        cursor = db.execute(
            "UPDATE goals SET name=?, target=?, current=?, monthly=? WHERE id=? AND user_id=?",
            (name, target, current, monthly, goal_id, session["user_id"]),
        )
        if cursor.rowcount == 0:
            db.close()
            return jsonify({"error": "Goal not found."}), 404
        saved_id = goal_id
    else:
        cursor = db.execute(
            "INSERT INTO goals (user_id, name, target, current, monthly) VALUES (?, ?, ?, ?, ?)",
            (session["user_id"], name, target, current, monthly),
        )
        saved_id = cursor.lastrowid
    db.commit()
    row = db.execute("SELECT * FROM goals WHERE id=? AND user_id=?", (saved_id, session["user_id"])).fetchone()
    db.close()
    return jsonify(dict(row))


@app.route("/api/goals/<int:goal_id>", methods=["DELETE"])
@login_required
def delete_goal(goal_id):
    db = get_db()
    db.execute("DELETE FROM goals WHERE id=? AND user_id=?", (goal_id, session["user_id"]))
    db.commit()
    db.close()
    return jsonify({"message": "Goal deleted."})


# ---------- Debts ----------
@app.route("/api/debts", methods=["GET"])
@login_required
def get_debts():
    db = get_db()
    rows = db.execute("SELECT * FROM debts WHERE user_id=? ORDER BY id DESC", (session["user_id"],)).fetchall()
    db.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/debts", methods=["POST"])
@login_required
def save_debt():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    balance = data.get("balance")
    apr = data.get("apr", 0)
    minimum = data.get("minimum", 0)
    debt_id = data.get("id")
    if not name or balance is None:
        return jsonify({"error": "Invalid debt."}), 400

    db = get_db()
    if debt_id:
        cursor = db.execute(
            "UPDATE debts SET name=?, balance=?, apr=?, minimum=? WHERE id=? AND user_id=?",
            (name, balance, apr, minimum, debt_id, session["user_id"]),
        )
        if cursor.rowcount == 0:
            db.close()
            return jsonify({"error": "Debt not found."}), 404
        saved_id = debt_id
    else:
        cursor = db.execute(
            "INSERT INTO debts (user_id, name, balance, apr, minimum) VALUES (?, ?, ?, ?, ?)",
            (session["user_id"], name, balance, apr, minimum),
        )
        saved_id = cursor.lastrowid
    db.commit()
    row = db.execute("SELECT * FROM debts WHERE id=? AND user_id=?", (saved_id, session["user_id"])).fetchone()
    db.close()
    return jsonify(dict(row))


@app.route("/api/debts/<int:debt_id>", methods=["DELETE"])
@login_required
def delete_debt(debt_id):
    db = get_db()
    db.execute("DELETE FROM debts WHERE id=? AND user_id=?", (debt_id, session["user_id"]))
    db.commit()
    db.close()
    return jsonify({"message": "Debt deleted."})


if __name__ == "__main__":
    init_db()
    print("\n======================================")
    print("        MONEYROOT IS RUNNING")
    print("======================================\n")
    print("Open: http://127.0.0.1:5000\n")
    app.run(debug=True)
