
import sqlite3

DATABASE_NAME = "database/finance.db"


def get_connection():
    """Create a connection to the SQLite database."""
    connection = sqlite3.connect(DATABASE_NAME)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    """Create all database tables."""

    connection = get_connection()

    # Existing transactions table
    connection.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            transaction_date DATE NOT NULL
        )
    """)

    # Existing budget settings table
    connection.execute("""
        CREATE TABLE IF NOT EXISTS budget_settings (
            id INTEGER PRIMARY KEY,
            monthly_limit REAL NOT NULL
        )
    """)

    # Savings Goals Table
    connection.execute("""
        CREATE TABLE IF NOT EXISTS savings_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            saved_amount REAL DEFAULT 0,
            created_at DATE DEFAULT CURRENT_DATE
        )
    """)

    # User Settings Table
    connection.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY,
            currency TEXT DEFAULT 'USD',
            theme TEXT DEFAULT 'dark'
        )
    """)

    # Default settings
    connection.execute("""
        INSERT OR IGNORE INTO user_settings (id, currency, theme)
        VALUES (1, 'USD', 'dark')
    """)

    connection.commit()
    connection.close()



   



if __name__ == "__main__":
    initialize_database()
    print("FinTrack database initialized successfully!")



def add_transaction(description, amount, category, transaction_type, transaction_date):
    """Save a new financial transaction."""

    connection = get_connection()

    connection.execute("""
        INSERT INTO transactions
        (description, amount, category, transaction_type, transaction_date)
        VALUES (?, ?, ?, ?, ?)
    """, (description, amount, category, transaction_type, transaction_date))



    connection.commit()
    connection.close()


def get_transactions():
    """Retrieve all saved transactions."""

    connection = get_connection()

    transactions = connection.execute("""
        SELECT * FROM transactions
        ORDER BY transaction_date DESC, id DESC
    """).fetchall()

    connection.close()

    return transactions



def get_monthly_budget():
    """Retrieve the saved monthly budget."""

    connection = get_connection()

    budget = connection.execute("""
        SELECT monthly_limit
        FROM budget_settings
        WHERE id = 1
    """).fetchone()

    connection.close()

    return budget["monthly_limit"]


def update_monthly_budget(amount):
    """Update the monthly budget."""

    connection = get_connection()

    connection.execute("""
        UPDATE budget_settings
        SET monthly_limit = ?
        WHERE id = 1
    """, (amount,))

    connection.commit()
    connection.close()




def delete_transaction(transaction_id):
    """Delete a transaction from the database."""
    connection = get_connection()

    connection.execute(
        "DELETE FROM transactions WHERE id = ?",
        (transaction_id,)
    )

    connection.commit()
    connection.close()


def update_transaction(transaction_id, description, amount,
                       transaction_type, category, transaction_date):
    """Update an existing transaction."""
    connection = get_connection()

    connection.execute("""
        UPDATE transactions
        SET description = ?,
            amount = ?,
            transaction_type = ?,
            category = ?,
            transaction_date = ?
        WHERE id = ?
    """, (
        description,
        amount,
        transaction_type,
        category,
        transaction_date,
        transaction_id
    ))

    connection.commit()
    connection.close()





# =====================================
# SAVINGS GOALS FUNCTIONS
# =====================================

def add_savings_goal(name, target_amount):
    """Create a new savings goal."""

    if not name.strip() or target_amount <= 0:
        raise ValueError("Enter a valid goal and target amount.")

    connection = get_connection()

    connection.execute("""
        INSERT INTO savings_goals (name, target_amount)
        VALUES (?, ?)
    """, (name.strip(), target_amount))

    connection.commit()
    connection.close()


def get_savings_goals():
    """Retrieve all savings goals."""

    connection = get_connection()

    goals = connection.execute("""
        SELECT * FROM savings_goals
        ORDER BY id DESC
    """).fetchall()

    connection.close()

    return goals


def update_savings_goal_progress(goal_id, amount):
    """Add money toward a savings goal."""

    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")

    connection = get_connection()

    connection.execute("""
        UPDATE savings_goals
        SET saved_amount = saved_amount + ?
        WHERE id = ?
    """, (amount, goal_id))

    connection.commit()
    connection.close()


def delete_savings_goal(goal_id):
    """Delete a savings goal."""

    connection = get_connection()

    connection.execute("""
        DELETE FROM savings_goals
        WHERE id = ?
    """, (goal_id,))

    connection.commit()
    connection.close()

