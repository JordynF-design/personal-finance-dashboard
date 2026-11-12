from flask import Flask, render_template, request, jsonify
from database.db import (
    initialize_database,
    add_transaction,
    get_transactions,
    get_monthly_budget,
    update_monthly_budget,
    delete_transaction,
    update_transaction,
    add_savings_goal,
    get_savings_goals,
    update_savings_goal_progress,
    delete_savings_goal
)
from datetime import date


app = Flask(__name__)

# Initialize database
initialize_database()

@app.route("/")
def home():
    transactions = [dict(row) for row in get_transactions()]

    today = date.today()
    current_month = today.month
    current_year = today.year

    monthly_income = 0
    monthly_expenses = 0
    total_income = 0
    total_expenses = 0

    for transaction in transactions:
        amount = float(transaction["amount"])

        transaction_date = date.fromisoformat(
            transaction["transaction_date"]
        )

        if transaction["transaction_type"] == "income":
            total_income += amount

            if (transaction_date.month == current_month
                    and transaction_date.year == current_year):
                monthly_income += amount

        else:
            total_expenses += amount

            if (transaction_date.month == current_month
                    and transaction_date.year == current_year):
                monthly_expenses += amount

    total_balance = total_income - total_expenses
    monthly_savings = monthly_income - monthly_expenses

    return render_template(
        "index.html",
        transactions=transactions,
        total_balance=total_balance,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        monthly_savings=monthly_savings
    )

# Retrieve transactions
@app.route("/api/transactions", methods=["GET"])
def transactions():
    data = get_transactions()
    return jsonify([dict(row) for row in data])


# Add a transaction
@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    data = request.get_json()

    description = data.get("description")
    amount = data.get("amount")
    category = data.get("category")
    transaction_type = data.get("transaction_type")
    transaction_date = data.get("transaction_date")

    if not all([description, amount, category, transaction_type, transaction_date]):
        return jsonify({"error": "Missing required fields"}), 400

    add_transaction(
        description,
        float(amount),
        category,
        transaction_type,
        transaction_date
    )

    return jsonify({"message": "Transaction saved!"}), 201



# Retrieve monthly budget
@app.route("/api/budget", methods=["GET"])
def get_budget():
    budget = get_monthly_budget()
    return jsonify({"monthly_limit": budget})


# Update monthly budget
@app.route("/api/budget", methods=["PUT"])
def update_budget():
    data = request.get_json(silent=True) or {}

    try:
        amount = float(data.get("monthly_limit"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid budget amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Budget must be greater than zero"}), 400

    update_monthly_budget(amount)

    return jsonify({
        "message": "Budget updated successfully",
        "monthly_limit": amount
    }), 200


# Delete a transaction
@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction_route(transaction_id):
    delete_transaction(transaction_id)

    return jsonify({
        "message": "Transaction deleted successfully"
    }), 200



# Update a transaction
@app.route("/api/transactions/<int:transaction_id>", methods=["PUT"])
def update_transaction_route(transaction_id):
    data = request.get_json(silent=True) or {}

    try:
        description = data["description"].strip()
        amount = float(data["amount"])
        transaction_type = data["transaction_type"]
        category = data["category"]
        transaction_date = data["transaction_date"]

        if not description or amount <= 0:
            return jsonify({"error": "Invalid transaction data"}), 400

        if transaction_type not in ("income", "expense"):
            return jsonify({"error": "Invalid transaction type"}), 400

        update_transaction(
            transaction_id,
            description,
            amount,
            transaction_type,
            category,
            transaction_date
        )

        return jsonify({
            "message": "Transaction updated successfully"
        }), 200

    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Invalid transaction data"}), 400



# Savings Goals Routes

@app.route("/api/savings-goals", methods=["GET"])
def get_savings_goals_route():
    goals = [dict(goal) for goal in get_savings_goals()]
    return jsonify(goals), 200


@app.route("/api/savings-goals", methods=["POST"])
def add_savings_goal_route():
    data = request.get_json(silent=True) or {}

    try:
        name = data["name"].strip()
        target_amount = float(data["target_amount"])

        add_savings_goal(name, target_amount)

        return jsonify({
            "message": "Savings goal created successfully"
        }), 201

    except (KeyError, TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


@app.route("/api/savings-goals/<int:goal_id>", methods=["PUT"])
def update_savings_goal_route(goal_id):
    data = request.get_json(silent=True) or {}

    try:
        amount = float(data["amount"])
        update_savings_goal_progress(goal_id, amount)

        return jsonify({
            "message": "Savings goal updated successfully"
        }), 200

    except (KeyError, TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400


@app.route("/api/savings-goals/<int:goal_id>", methods=["DELETE"])
def delete_savings_goal_route(goal_id):
    delete_savings_goal(goal_id)

    return jsonify({
        "message": "Savings goal deleted successfully"
    }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5001)