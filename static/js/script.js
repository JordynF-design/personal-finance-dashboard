
// Find the theme button
const themeToggle = document.getElementById("theme-toggle");

// Get the saved theme, or use light mode
const savedTheme = localStorage.getItem("finance-theme") || "light";

// Apply the theme
document.documentElement.setAttribute("data-theme", savedTheme);

// Update the button text
function updateThemeButton(theme) {
    if (theme === "dark") {
        themeToggle.textContent = "☀ Light Mode";
    } else {
        themeToggle.textContent = "🌙 Dark Mode";
    }
}

// Display the correct button label
updateThemeButton(savedTheme);

// Listen for button clicks
themeToggle.addEventListener("click", function () {

    // Check the current theme
    const currentTheme =
        document.documentElement.getAttribute("data-theme");

    // Switch to the opposite theme
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    // Apply the new theme
    document.documentElement.setAttribute("data-theme", newTheme);

    // Save the user's preference
    localStorage.setItem("finance-theme", newTheme);

    // Update the button
    updateThemeButton(newTheme);

});





// =====================================
// INCOME VS EXPENSES CHART
// =====================================

const chartCanvas = document.getElementById("incomeExpenseChart");

if (chartCanvas) {
    const ctx = chartCanvas.getContext("2d");

    const transactions = window.fintrackTransactions || [];

    // Generate the latest six months
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - i);

        months.push({
            label: date.toLocaleString("en-US", {
                month: "long"
            }),
            month: date.getMonth(),
            year: date.getFullYear(),
            income: 0,
            expenses: 0
        });
    }

    // Calculate totals from saved transactions
    transactions.forEach(transaction => {
        const date = new Date(
            transaction.transaction_date + "T00:00:00"
        );

        const monthData = months.find(
            m => m.month === date.getMonth() &&
                 m.year === date.getFullYear()
        );

        if (!monthData) return;

        const amount = Number(transaction.amount);

        if (transaction.transaction_type === "income") {
            monthData.income += amount;
        } else {
            monthData.expenses += amount;
        }
    });

    new Chart(ctx, {
        type: "bar",

        data: {
            labels: months.map(m => m.label),

            datasets: [
                {
                    label: "Income",
                    data: months.map(m => m.income),
                    backgroundColor: "#7065e8",
                    borderRadius: 6
                },
                {
                    label: "Expenses",
                    data: months.map(m => m.expenses),
                    backgroundColor: "#48bfa0",
                    borderRadius: 6
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "top"
                }
            },

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}





// =====================================
// ADD TRANSACTION FORM
// =====================================

const transactionForm = document.getElementById("transactionForm");

if (transactionForm) {
    transactionForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const description = document.getElementById("description").value.trim();
        const amount = document.getElementById("amount").value;
        const transactionType = document.getElementById("transactionType").value;
        const category = document.getElementById("category").value;
        const transactionDate = document.getElementById("transactionDate").value;

        const transaction = {
            description: description,
            amount: amount,
            transaction_type: transactionType,
            category: category,
            transaction_date: transactionDate
        };

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(transaction)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Could not save transaction.");
            }

            alert("Transaction saved successfully!");

            transactionForm.reset();

            window.location.reload();

        } catch (error) {
            alert("Error: " + error.message);
        }
    });
}




// =====================================
// MONTHLY BUDGET FUNCTIONALITY
// =====================================

const budgetForm = document.getElementById("budget-form");
const budgetInput = document.getElementById("budget-input");
const budgetLimit = document.getElementById("budget-limit");
const budgetProgress = document.getElementById("budget-progress");
const budgetNote = document.getElementById("budget-note");
const budgetMessage = document.getElementById("budget-message");

function updateBudgetDisplay(limit) {
    const expensesElement = document.querySelector(".budget-amount h2");

    const expenses = expensesElement
        ? Number(expensesElement.textContent.replace(/[$,]/g, ""))
        : 0;

    const percentage = Math.min((expenses / limit) * 100, 100);

    budgetLimit.textContent = limit.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    budgetProgress.style.width = percentage + "%";

    if (expenses <= limit) {
        budgetNote.textContent =
            "$" + (limit - expenses).toFixed(2) + " remaining this month";
    } else {
        budgetNote.textContent =
            "$" + (expenses - limit).toFixed(2) + " over budget this month";
    }
}

// Load saved budget
async function loadBudget() {
    try {
        const response = await fetch("/api/budget");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load budget.");
        }

        updateBudgetDisplay(Number(data.monthly_limit));
    } catch (error) {
        console.error("Budget loading error:", error);
        budgetNote.textContent = "Unable to load budget.";
    }
}

// Save new budget
if (budgetForm) {
    budgetForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const amount = Number(budgetInput.value);

        if (!Number.isFinite(amount) || amount <= 0) {
            budgetMessage.textContent = "Enter a valid budget amount.";
            return;
        }

        try {
            const response = await fetch("/api/budget", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    monthly_limit: amount
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not save budget.");
            }

            updateBudgetDisplay(Number(data.monthly_limit));

            budgetMessage.textContent = "Budget saved successfully!";
            budgetInput.value = "";

        } catch (error) {
            budgetMessage.textContent = "Error: " + error.message;
        }
    });
}

// Initialize budget
if (budgetForm) {
    loadBudget();
}




// ===================================
// EDIT AND DELETE TRANSACTIONS
// ===================================

document.addEventListener("click", async function (event) {

    // DELETE TRANSACTION
    const deleteButton = event.target.closest(".delete-btn");

    if (deleteButton) {
        const transactionId = deleteButton.dataset.id;

        if (!confirm("Are you sure you want to delete this transaction?")) {
            return;
        }

        try {
            const response = await fetch(
                `/api/transactions/${transactionId}`,
                { method: "DELETE" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not delete transaction.");
            }

            alert("Transaction deleted successfully!");
            window.location.reload();

        } catch (error) {
            alert("Error: " + error.message);
        }

        return;
    }

    // EDIT TRANSACTION
    const editButton = event.target.closest(".edit-btn");

    if (editButton) {
        const transactionId = Number(editButton.dataset.id);

        const transactions = window.fintrackTransactions || [];

        const transaction = transactions.find(
            item => Number(item.id) === transactionId
        );

        if (!transaction) {
            alert("Transaction not found.");
            return;
        }

        const description = prompt(
            "Transaction description:",
            transaction.description
        );

        if (description === null) return;

        const amount = prompt(
            "Transaction amount:",
            transaction.amount
        );

        if (amount === null) return;

        const transactionType = prompt(
            "Type: income or expense",
            transaction.transaction_type
        );

        if (transactionType === null) return;

        const category = prompt(
            "Transaction category:",
            transaction.category
        );

        if (category === null) return;

        const transactionDate = prompt(
            "Transaction date (YYYY-MM-DD):",
            transaction.transaction_date
        );

        if (transactionDate === null) return;

        try {
            const response = await fetch(
                `/api/transactions/${transactionId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        description: description,
                        amount: amount,
                        transaction_type: transactionType.toLowerCase(),
                        category: category,
                        transaction_date: transactionDate
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not update transaction.");
            }

            alert("Transaction updated successfully!");
            window.location.reload();

        } catch (error) {
            alert("Error: " + error.message);
        }
    }
});






// ===================================
// SAVINGS GOALS FUNCTIONALITY
// ===================================

const savingsGoalName = document.getElementById("goal-name");
const savingsGoalTarget = document.getElementById("goal-target");
const addSavingsGoalBtn = document.getElementById("add-goal-btn");
const savingsGoalsList = document.getElementById("savings-goals-list");

// Load savings goals
async function loadSavingsGoals() {
    try {
        const response = await fetch("/api/savings-goals");
        const goals = await response.json();

        if (!response.ok) {
            throw new Error("Could not load savings goals.");
        }

        savingsGoalsList.innerHTML = "";

        if (goals.length === 0) {
            savingsGoalsList.innerHTML =
                "<p>No savings goals yet. Create your first goal!</p>";
            return;
        }

        goals.forEach(goal => {
            const percentage = Math.min(
                (Number(goal.saved_amount) /
                Number(goal.target_amount)) * 100,
                100
            );

            const card = document.createElement("div");
            card.className = "savings-goal-card";

            card.innerHTML = `
                <h3>${escapeGoalHTML(goal.name)}</h3>

                <p>
                    $${Number(goal.saved_amount).toFixed(2)}
                    saved of
                    $${Number(goal.target_amount).toFixed(2)}
                </p>

                <div class="savings-progress">
                    <div class="savings-progress-fill"
                         style="width: ${percentage}%">
                    </div>
                </div>

                <p>${percentage.toFixed(1)}% completed</p>

                <div class="savings-goal-actions">
                    <button class="add-progress-btn"
                            data-id="${goal.id}">
                        Add Money
                    </button>

                    <button class="delete-goal-btn"
                            data-id="${goal.id}">
                        Delete
                    </button>
                </div>
            `;

            savingsGoalsList.appendChild(card);
        });

    } catch (error) {
        console.error("Savings Goals Error:", error);
        savingsGoalsList.textContent =
            "Unable to load savings goals.";
    }
}

// Escape goal names before displaying them
function escapeGoalHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Create a savings goal
addSavingsGoalBtn.addEventListener("click", async () => {
    const name = savingsGoalName.value.trim();
    const target = Number(savingsGoalTarget.value);

    if (!name || !Number.isFinite(target) || target <= 0) {
        alert("Please enter a valid goal name and target amount.");
        return;
    }

    try {
        const response = await fetch("/api/savings-goals", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                target_amount: target
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not create goal.");
        }

        savingsGoalName.value = "";
        savingsGoalTarget.value = "";

        await loadSavingsGoals();

    } catch (error) {
        alert(error.message);
    }
});

// Add money or delete a savings goal
savingsGoalsList.addEventListener("click", async (event) => {

    const addButton = event.target.closest(".add-progress-btn");
    const deleteButton = event.target.closest(".delete-goal-btn");

    if (addButton) {
        const goalId = addButton.dataset.id;
        const amount = Number(
            prompt("How much money would you like to add?")
        );

        if (!Number.isFinite(amount) || amount <= 0) {
            return;
        }

        try {
            const response = await fetch(
                `/api/savings-goals/${goalId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        amount: amount
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not update goal.");
            }

            await loadSavingsGoals();

        } catch (error) {
            alert(error.message);
        }
    }

    if (deleteButton) {
        const goalId = deleteButton.dataset.id;

        if (!confirm("Are you sure you want to delete this savings goal?")) {
            return;
        }

        try {
            const response = await fetch(
                `/api/savings-goals/${goalId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not delete goal.");
            }

            await loadSavingsGoals();

        } catch (error) {
            alert(error.message);
        }
    }
});

// Load goals when the page opens
loadSavingsGoals();
