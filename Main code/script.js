let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = null;
let db;
const request = indexedDB.open("financeDB", 1);

request.onerror = function(event) {
    console.error("Database error: " + event.target.errorCode);
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log("Database opened successfully");
    displayUsername();
    updateUI();
};

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const userStore = db.createObjectStore("users", { keyPath: "username" });
    userStore.createIndex("username", "username", { unique: true });
    const transactionStore = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
    transactionStore.createIndex("username", "username", { unique: false });
};

function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

function displayUsername() {
    const currentUser = getCurrentUser();
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.textContent = currentUser;
    }
}


function signUp() {
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const confirmPassword = document.getElementById('signup-confirm-password').value.trim();
    const signupError = document.getElementById('signup-error');

    if (!username || !password || !confirmPassword) {
        signupError.textContent = 'All fields are required.';
        signupError.style.display = 'block';
        setTimeout(() => {
            signupError.style.display = 'none';
        }, 3000);
        return;
    }

    if (password.length < 8) {
        signupError.textContent = 'Password must be at least 8 characters long.';
        signupError.style.display = 'block';
        setTimeout(() => {
            signupError.style.display = 'none';
        }, 3000);
        return;
    }

    if (password !== confirmPassword) {
        signupError.textContent = 'Passwords do not match.';
        signupError.style.display = 'block';
        setTimeout(() => {
            signupError.style.display = 'none';
        }, 3000);
        return;
    }

    const transaction = db.transaction(["users"], "readwrite");
    const userStore = transaction.objectStore("users");
    const request = userStore.get(username);

    request.onsuccess = function(event) {
        if (event.target.result) {
            signupError.textContent = 'Username already exists.';
            signupError.style.display = 'block';
            setTimeout(() => {
                signupError.style.display = 'none';
            }, 3000);
        } else {
            const hashedPassword = CryptoJS.SHA256(password).toString();
            userStore.add({ username, password: hashedPassword });
            window.location.href = 'signin.html'; // Redirect to sign-in page
        }
    };
}


    function signIn() {
        const username = document.getElementById('signin-username').value.trim();
        const password = document.getElementById('signin-password').value.trim();
        const signinError = document.getElementById('signin-error');
    
        if (!username || !password) {
            signinError.textContent = 'All fields are required.';
            signinError.style.display = 'block';
            setTimeout(() => {
                signinError.style.display = 'none';
            }, 3000);
            return;
        }
    
        const transaction = db.transaction(["users"], "readonly");
        const userStore = transaction.objectStore("users");
        const request = userStore.get(username);
    
        request.onsuccess = function(event) {
            const user = event.target.result;
            if (!user) {
                signinError.textContent = 'No such account found.';
                signinError.style.display = 'block';
                setTimeout(() => {
                    signinError.style.display = 'none';
                }, 3000);
            } else {
                const hashedPassword = CryptoJS.SHA256(password).toString();
                if (user.password === hashedPassword) {
                    console.log('User signed in successfully!');
                    currentUser = username;
                    localStorage.setItem('currentUser', currentUser);
                    window.location.href = 'dashboard.html'; // Redirect to dashboard
                } else {
                    signinError.textContent = 'Invalid username or password.';
                    signinError.style.display = 'block';
                    setTimeout(() => {
                        signinError.style.display = 'none';
                    }, 3000);
                }
            }
        };
    }


function signOut() {
    localStorage.removeItem('currentUser');
    window.location.href = 'signin.html'; // Redirect to sign-in page
}

function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

function displayUsername() {
    const currentUser = getCurrentUser();
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.textContent = currentUser;
    }
}


document.getElementById('clearTransactionsButton').addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all transactions? This action cannot be undone.')) {
        const currentUser = getCurrentUser();
        const transaction = db.transaction(["transactions"], "readwrite");
        const transactionStore = transaction.objectStore("transactions");
        const index = transactionStore.index("username");
        const request = index.openCursor(IDBKeyRange.only(currentUser));

        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                transactionStore.delete(cursor.primaryKey);
                cursor.continue();
            } else {
                updateUI(); // Refresh the UI to show that transactions are cleared
                alert('All transactions have been cleared.');
            }
        };

        request.onerror = function(event) {
            console.error('Error clearing transactions:', event.target.errorCode);
            alert('An error occurred while clearing transactions.');
        };
    }
});


function addTransaction() {
    const currentUser = getCurrentUser();
    const date = new Date().toISOString().split('T')[0]; // Get current date
    const receiptNo = document.getElementById('receiptNo').value;
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const errorMessage = document.getElementById('errorMessage');

    if (type === 'expense' && receiptNo.trim() === '') {
        errorMessage.textContent = 'Receipt number is required for expenses.';
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
        return;
    }

    if (description.trim() === '' || isNaN(amount)) {
        errorMessage.textContent = 'Please fill out all fields with valid data.';
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000); // Hide error message after 3 seconds
        return;
    } else {
        errorMessage.style.display = 'none';
    }

    const transaction = db.transaction(["transactions"], "readwrite");
    const transactionStore = transaction.objectStore("transactions");
    const transactionData = {
        username: currentUser,
        date,
        receiptNo: type === 'income' ? '' : receiptNo, // Empty receipt number for income
        description,
        amount: type === 'income' ? amount : -amount,
        type
    };

    transactionStore.add(transactionData).onsuccess = function(event) {
        updateUI();
        
        // Reset form fields
        document.getElementById('receiptNo').value = '';
        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('type').value = 'income';
    };
}


function updateUI() {
    const currentUser = getCurrentUser();
    const transaction = db.transaction(["transactions"], "readonly");
    const transactionStore = transaction.objectStore("transactions");
    const index = transactionStore.index("username");
    const request = index.getAll(currentUser);

    request.onsuccess = function(event) {
        const transactions = event.target.result || [];
        
        const transactionList = document.getElementById('transactionList');
        const totalIncomeEl = document.getElementById('totalIncome');
        const totalExpensesEl = document.getElementById('totalExpenses');
        const balanceEl = document.getElementById('balance');

        transactionList.innerHTML = '';
        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach((transaction) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.receiptNo}</td>
                <td>${transaction.description}</td>
                <td>${transaction.type}</td>
                <td>KES ${Math.abs(transaction.amount)}</td>
            `;
            transactionList.appendChild(row);

            if (transaction.amount > 0) {
                totalIncome += transaction.amount;
            } else {
                totalExpenses += transaction.amount;
            }
        });

        totalIncomeEl.textContent = totalIncome;
        totalExpensesEl.textContent = Math.abs(totalExpenses);
        balanceEl.textContent = totalIncome + totalExpenses;

        if (totalIncome + totalExpenses >= 0) {
            balanceEl.classList.remove('negative');
            balanceEl.classList.add('positive');
        } else {
            balanceEl.classList.remove('positive');
            balanceEl.classList.add('negative');
        }
    };
}


function shareMonthlySummary() {
    const currentUser = getCurrentUser();
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    const totalIncome = document.getElementById('totalIncomeSummary').textContent;
    const totalExpenses = document.getElementById('totalExpensesSummary').textContent;
    const balance = document.getElementById('balanceSummary').textContent;

    let transactionDetails = [];
    const transaction = db.transaction(["transactions"], "readonly");
    const transactionStore = transaction.objectStore("transactions");
    const index = transactionStore.index("username");
    const request = index.getAll(currentUser);

    request.onsuccess = function(event) {
        const transactions = event.target.result || [];

        transactions.forEach(transaction => {
            const [transactionYear, transactionMonth] = transaction.date.split('-');
            if (transactionMonth === month && transactionYear === year) {
                transactionDetails.push(`${transaction.date} - ${transaction.receiptNo} - ${transaction.description} (${transaction.type}): KES ${Math.abs(transaction.amount)}`);
            }
        });

        const message = `Monthly Summary (${document.getElementById('selectedMonth').textContent} ${year}):\n\nTotal Income: KES ${totalIncome}\nTotal Expenses: KES ${totalExpenses}\nBalance: KES ${balance}\n\nTransactions:\n${transactionDetails.join('\n')}`;

        // Share via WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    request.onerror = function(event) {
        console.error('Error fetching transactions for sharing:', event.target.errorCode);
    };
}

function shareYearlySummary() {
    const currentUser = getCurrentUser();
    const year = document.getElementById('yearSelectReport').value;
    const selectedYearReport = document.getElementById('selectedYearReport').textContent;

    let transactionDetails = [];
    const transaction = db.transaction(["transactions"], "readonly");
    const transactionStore = transaction.objectStore("transactions");
    const index = transactionStore.index("username");
    const request = index.getAll(currentUser);

    request.onsuccess = function(event) {
        const transactions = event.target.result || [];
        const monthlyData = Array(12).fill().map(() => ({ income: 0, expenses: 0 }));

        transactions.forEach(transaction => {
            const [transactionYear, transactionMonth] = transaction.date.split('-');

            if (transactionYear === year) {
                const monthIndex = parseInt(transactionMonth) - 1;
                if (transaction.amount > 0) {
                    monthlyData[monthIndex].income += transaction.amount;
                } else {
                    monthlyData[monthIndex].expenses += transaction.amount;
                }
            }
        });

        monthlyData.forEach((data, index) => {
            const balance = data.income + data.expenses;
            transactionDetails.push(`${new Date(0, index).toLocaleString('en-US', { month: 'long' })}: Income: KES ${data.income}, Expenses: KES ${Math.abs(data.expenses)}, Balance: KES ${balance}`);
        });

        const message = `Yearly Summary for ${selectedYearReport}:\n\n${transactionDetails.join('\n')}`;

        // Share via WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    request.onerror = function(event) {
        console.error('Error fetching transactions for sharing:', event.target.errorCode);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the month dropdown and year input to current month and year
    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Format month as MM
    const currentYear = currentDate.getFullYear();
    document.getElementById('monthSelect').value = currentMonth;
    document.getElementById('yearSelect').value = currentYear;
    fetchRecords();

    // Add event listener to year input to handle Enter key press
    document.getElementById('yearSelect').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            fetchRecords();
            document.getElementById('yearIndicator').style.display = 'block';
            setTimeout(() => {
                document.getElementById('yearIndicator').style.display = 'none';
            }, 2000);
        }
    });

    // Add event listener to month select to also show year indication
    document.getElementById('monthSelect').addEventListener('change', function() {
        fetchRecords();
        document.getElementById('yearIndicator').style.display = 'block';
        setTimeout(() => {
            document.getElementById('yearIndicator').style.display = 'none';
        }, 2000);
    });

    // Fetch yearly report on load
    document.getElementById('yearSelectReport') && fetchYearlyReport();
});


document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    updateUI();
});

function deleteAccount() {
    const password = document.getElementById("delete-password").value.trim();
    const deleteError = document.getElementById('delete-error');
    const currentUser = getCurrentUser();

    const transaction = db.transaction(["users", "transactions"], "readwrite");
    const userStore = transaction.objectStore("users");
    const transactionStore = transaction.objectStore("transactions");

    const userRequest = userStore.get(currentUser);

    userRequest.onsuccess = function(event) {
        const user = event.target.result;

        const hashedPassword = CryptoJS.SHA256(password).toString(); // Hash the entered password

        if (user && user.password === hashedPassword) { // Compare the hashed passwords
            userStore.delete(currentUser);

            const transactionIndex = transactionStore.index("username");
            const transactionCursor = transactionIndex.openCursor(IDBKeyRange.only(currentUser));

            transactionCursor.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    transactionStore.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    localStorage.removeItem('currentUser');
                    alert('Account deleted successfully.');
                    window.location.href = 'signin.html'; // Redirect to sign-in page
                }
            };
        } else {
            deleteError.style.display = 'block';
            setTimeout(() => {
                deleteError.style.display = 'none';
            }, 3000);
        }
    };

    userRequest.onerror = function(event) {
        console.error('Error retrieving user:', event.target.errorCode);
        deleteError.style.display = 'block';
        setTimeout(() => {
            deleteError.style.display = 'none';
        }, 3000);
    };
}


function handleYearChange(event) {
    if (event.key === 'Enter') {
        if (event.target.id === 'yearSelect') {
            fetchRecords();
        } else if (event.target.id === 'yearSelectReport') {
            fetchYearlyReport();
        }
        document.getElementById('yearIndicator').style.display = 'block';
        setTimeout(() => {
            document.getElementById('yearIndicator').style.display = 'none';
        }, 2000);
    }
}

function fetchRecords() {
    console.log("Fetching records...");
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    const selectedMonth = document.getElementById('selectedMonth');
    const selectedYear = document.getElementById('selectedYear');
    selectedMonth.textContent = document.getElementById('monthSelect').options[document.getElementById('monthSelect').selectedIndex].text;
    selectedYear.textContent = year;

    const currentUser = getCurrentUser();
    console.log(`Current User: ${currentUser}, Year: ${year}, Month: ${month}`);
    const transaction = db.transaction(["transactions"], "readonly");
    const transactionStore = transaction.objectStore("transactions");
    const index = transactionStore.index("username");
    const request = index.getAll(currentUser);

    request.onsuccess = function(event) {
        const transactions = event.target.result || [];
        console.log(`Fetched ${transactions.length} transactions`);
        const recordsList = document.getElementById('recordsList');
        recordsList.innerHTML = '';

        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(transaction => {
            const [transactionYear, transactionMonth] = transaction.date.split('-');
            console.log(`Transaction Date: ${transaction.date}, Month: ${transactionMonth}, Year: ${transactionYear}`);

            if (transactionMonth === month && transactionYear === year) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${transaction.date}</td>
                    <td>${transaction.receiptNo}</td>
                    <td>${transaction.description}</td>
                    <td>${transaction.type}</td>
                    <td>KES ${Math.abs(transaction.amount)}</td>
                `;
                recordsList.appendChild(row);

                if (transaction.amount > 0) {
                    totalIncome += transaction.amount;
                } else {
                    totalExpenses += transaction.amount;
                }
            }
        });

        console.log(`Total Income: ${totalIncome}, Total Expenses: ${Math.abs(totalExpenses)}, Balance: ${totalIncome + totalExpenses}`);
        document.getElementById('totalIncomeSummary').textContent = totalIncome;
        document.getElementById('totalExpensesSummary').textContent = Math.abs(totalExpenses);
        document.getElementById('balanceSummary').textContent = totalIncome + totalExpenses;

        if (totalIncome + totalExpenses >= 0) {
            document.getElementById('balanceSummary').classList.remove('negative');
            document.getElementById('balanceSummary').classList.add('positive');
        } else {
            document.getElementById('balanceSummary').classList.remove('positive');
            document.getElementById('balanceSummary').classList.add('negative');
        }
    };

    request.onerror = function(event) {
        console.error('Error fetching records:', event.target.errorCode);
    };
}

function fetchYearlyReport() {
    console.log("Fetching yearly report...");
    const year = document.getElementById('yearSelectReport').value;
    const selectedYearReport = document.getElementById('selectedYearReport');
    selectedYearReport.textContent = year;

    const currentUser = getCurrentUser();
    console.log(`Current User: ${currentUser}, Year: ${year}`);
    const transaction = db.transaction(["transactions"], "readonly");
    const transactionStore = transaction.objectStore("transactions");
    const index = transactionStore.index("username");
    const request = index.getAll(currentUser);

    request.onsuccess = function(event) {
        const transactions = event.target.result || [];
        console.log(`Fetched ${transactions.length} transactions`);
        const yearlyReportList = document.getElementById('yearlyReportList');
        yearlyReportList.innerHTML = '';

        const monthlyData = Array(12).fill().map(() => ({ income: 0, expenses: 0 }));

        transactions.forEach(transaction => {
            const [transactionYear, transactionMonth] = transaction.date.split('-');
            console.log(`Transaction Date: ${transaction.date}, Month: ${transactionMonth}, Year: ${transactionYear}`);

            if (transactionYear === year) {
                const monthIndex = parseInt(transactionMonth) - 1;
                if (transaction.amount > 0) {
                    monthlyData[monthIndex].income += transaction.amount;
                } else {
                    monthlyData[monthIndex].expenses += transaction.amount;
                }
            }
        });

        monthlyData.forEach((data, index) => {
            const balance = data.income + data.expenses;
            console.log(`Month: ${new Date(0, index).toLocaleString('en-US', { month: 'long' })}, Income: ${data.income}, Expenses: ${Math.abs(data.expenses)}, Balance: ${balance}`);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(0, index).toLocaleString('en-US', { month: 'long' })}</td>
                <td>KES ${data.income}</td>
                <td>KES ${Math.abs(data.expenses)}</td>
                <td>KES ${balance}</td>
            `;
            yearlyReportList.appendChild(row);
        });
    };

    request.onerror = function(event) {
        console.error('Error fetching yearly report:', event.target.errorCode);
    };
}

function shareYearlySummary() {
    const currentUser = getCurrentUser();
    const year = document.getElementById('yearSelectReport').value;
    const selectedYearReport = document.getElementById('selectedYearReport').textContent;

    let transactionDetails = [];
    const transaction = db.transaction(["transactions"], "readonly");
    const transactionStore = transaction.objectStore("transactions");
    const index = transactionStore.index("username");
    const request = index.getAll(currentUser);

    request.onsuccess = function(event) {
        const transactions = event.target.result || [];
        const monthlyData = Array(12).fill().map(() => ({ income: 0, expenses: 0 }));

        transactions.forEach(transaction => {
            const [transactionYear, transactionMonth] = transaction.date.split('-');

            if (transactionYear === year) {
                const monthIndex = parseInt(transactionMonth) - 1;
                if (transaction.amount > 0) {
                    monthlyData[monthIndex].income += transaction.amount;
                } else {
                    monthlyData[monthIndex].expenses += transaction.amount;
                }
            }
        });

        monthlyData.forEach((data, index) => {
            const balance = data.income + data.expenses;
            transactionDetails.push(`${new Date(0, index).toLocaleString('en-US', { month: 'long' })}: Income: KES ${data.income}, Expenses: KES ${Math.abs(data.expenses)}, Balance: KES ${balance}`);
        });

        const message = `Yearly Summary for ${selectedYearReport}:\n\n${transactionDetails.join('\n')}`;

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    request.onerror = function(event) {
        console.error('Error fetching transactions for sharing:', event.target.errorCode);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    document.getElementById('yearSelectReport').value = currentYear;
    fetchYearlyReport();
});