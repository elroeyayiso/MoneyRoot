// ============================================================
// MONEYROOT
// Main JavaScript
// Landing Page + Authentication + Dashboard + Guest Mode
// ============================================================

const categories = [
    "Food",
    "Housing",
    "Transportation",
    "Shopping",
    "Bills",
    "Health",
    "Entertainment",
    "Education",
    "Other"
];

const state = {
    mode: "guest",
    user: null,

    transactions: [],
    budgets: [],
    goals: [],
    debts: [],

    editingTransactionId: null,
    editingBudgetId: null,
    editingGoalId: null,
    editingDebtId: null,

    charts: {
        category: null,
        budget: null,
        incomeExpense: null,
        analyticsCategory: null
    }
};


// ============================================================
// HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}


function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(Number(value) || 0);
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function todayString() {
    const date = new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
}


function formReset(id) {
    const form = $(id);

    if (!form) return;

    form.reset();

    if (id === "transactionForm") {

        if ($("transactionType")) {
            $("transactionType").value = "expense";
        }

        if ($("transactionCategory")) {
            $("transactionCategory").value = "Other";
        }

        if ($("transactionDate")) {
            $("transactionDate").value = todayString();
        }
    }

    if (id === "budgetForm") {

        if ($("budgetCategory")) {
            $("budgetCategory").value = "Housing";
        }

        if ($("budgetAmount")) {
            $("budgetAmount").value = "";
        }

        if ($("budgetId")) {
            $("budgetId").value = "";
        }
    }

    if (id === "goalForm") {

        if ($("goalCurrent")) {
            $("goalCurrent").value = "0";
        }

        if ($("goalMonthly")) {
            $("goalMonthly").value = "0";
        }

        if ($("goalId")) {
            $("goalId").value = "";
        }
    }

    if (id === "debtForm") {

        if ($("debtBalance")) {
            $("debtBalance").value = "";
        }

        if ($("debtApr")) {
            $("debtApr").value = "";
        }

        if ($("debtMinimum")) {
            $("debtMinimum").value = "";
        }

        if ($("debtId")) {
            $("debtId").value = "";
        }
    }
}


// ============================================================
// API
// ============================================================

async function apiRequest(url, options = {}) {

    const requestOptions = {
        credentials: "same-origin",
        ...options,

        headers: {
            ...(options.body
                ? {
                    "Content-Type": "application/json"
                }
                : {}),

            ...(options.headers || {})
        }
    };

    try {

        const response = await fetch(
            url,
            requestOptions
        );

        let data = {};

        const contentType =
            response.headers.get("content-type") || "";

        if (
            contentType.includes("application/json")
        ) {

            data = await response.json();

        } else {

            const text = await response.text();

            data = {
                error:
                    text ||
                    "Something went wrong."
            };
        }

        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                `Server error (${response.status})`
            );
        }

        return data;

    } catch (error) {

        console.error(
            `API request failed: ${url}`,
            error
        );

        throw error;
    }
}


// ============================================================
// LANDING PAGE
// ============================================================

function openGetStarted() {

    const modal = $("getStartedModal");

    if (!modal) {
        console.error(
            "getStartedModal was not found."
        );

        return;
    }

    modal.classList.add("active");

    document.body.style.overflow = "hidden";
}


function closeGetStarted() {

    const modal = $("getStartedModal");

    if (!modal) return;

    modal.classList.remove("active");

    if (
        !$("authModal")?.classList.contains("active")
    ) {

        document.body.style.overflow = "";
    }
}


function openAuth(type = "login") {

    closeGetStarted();

    const modal = $("authModal");

    if (!modal) {

        console.error(
            "authModal was not found."
        );

        return;
    }

    modal.classList.add("active");

    document.body.style.overflow = "hidden";

    switchAuth(type);
}


function closeAuth() {

    const modal = $("authModal");

    if (!modal) return;

    modal.classList.remove("active");

    document.body.style.overflow = "";

    clearAuthErrors();
}


function switchAuth(type = "login") {

    const loginForm = $("loginForm");
    const signupForm = $("signupForm");

    if (!loginForm || !signupForm) {

        console.error(
            "Login/signup forms not found."
        );

        return;
    }

    loginForm.classList.remove("active");
    signupForm.classList.remove("active");

    clearAuthErrors();

    if (type === "signup") {

        signupForm.classList.add("active");

        setTimeout(
            () => {
                $("signupName")?.focus();
            },
            50
        );

    } else {

        loginForm.classList.add("active");

        setTimeout(
            () => {
                $("loginEmail")?.focus();
            },
            50
        );
    }
}


function clearAuthErrors() {

    const loginError = $("loginError");
    const signupError = $("signupError");

    if (loginError) {

        loginError.textContent = "";

        loginError.classList.remove("show");
    }

    if (signupError) {

        signupError.textContent = "";

        signupError.classList.remove("show");
    }
}


function showAuthError(type, message) {

    const element =
        type === "signup"
            ? $("signupError")
            : $("loginError");

    if (!element) {

        alert(message);

        return;
    }

    element.textContent = message;

    element.classList.add("show");
}


function handleModalBackground(event, modalId) {

    if (event.target.id !== modalId) {
        return;
    }

    if (modalId === "getStartedModal") {
        closeGetStarted();
    }

    if (modalId === "authModal") {
        closeAuth();
    }
}


// ============================================================
// GUEST MODE
// ============================================================

function getGuestData() {

    try {

        const stored =
            localStorage.getItem(
                "moneyRootGuestData"
            );

        if (!stored) {

            return {
                transactions: [],
                budgets: [],
                goals: [],
                debts: []
            };
        }

        const data = JSON.parse(stored);

        return {

            transactions:
                Array.isArray(data.transactions)
                    ? data.transactions
                    : [],

            budgets:
                Array.isArray(data.budgets)
                    ? data.budgets
                    : [],

            goals:
                Array.isArray(data.goals)
                    ? data.goals
                    : [],

            debts:
                Array.isArray(data.debts)
                    ? data.debts
                    : []
        };

    } catch (error) {

        console.error(
            "Could not read guest data:",
            error
        );

        return {
            transactions: [],
            budgets: [],
            goals: [],
            debts: []
        };
    }
}


function saveGuestData() {

    localStorage.setItem(
        "moneyRootGuestData",

        JSON.stringify({

            transactions:
                state.transactions,

            budgets:
                state.budgets,

            goals:
                state.goals,

            debts:
                state.debts
        })
    );
}


function continueAsGuest() {

    closeGetStarted();
    closeAuth();

    state.mode = "guest";

    state.user = {
        name: "Guest",
        email: ""
    };

    localStorage.setItem(
        "moneyRootMode",
        "guest"
    );

    const data = getGuestData();

    state.transactions = data.transactions;
    state.budgets = data.budgets;
    state.goals = data.goals;
    state.debts = data.debts;

    window.location.href = "/dashboard";
}


// ============================================================
// SIGN UP
// ============================================================

async function handleSignup(event) {

    event.preventDefault();

    clearAuthErrors();

    const name =
        $("signupName")
            ?.value
            .trim();

    const email =
        $("signupEmail")
            ?.value
            .trim();

    const password =
        $("signupPassword")
            ?.value;

    if (!name || !email || !password) {

        showAuthError(
            "signup",
            "Please complete all fields."
        );

        return;
    }

    if (password.length < 6) {

        showAuthError(
            "signup",
            "Your password must be at least 6 characters."
        );

        return;
    }

    const button =
        $("signupForm")
            ?.querySelector(".auth-submit");

    const originalText =
        button?.textContent;

    if (button) {

        button.disabled = true;
        button.textContent = "Creating account...";
    }

    try {

        const result =
            await apiRequest(
                "/api/signup",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            name,
                            email,
                            password
                        })
                }
            );

        state.mode = "account";

        state.user = result.user || null;

        localStorage.setItem(
            "moneyRootMode",
            "account"
        );

        if (result.user) {

            localStorage.setItem(
                "moneyRootUser",
                JSON.stringify(result.user)
            );
        }

        state.transactions = [];
        state.budgets = [];
        state.goals = [];
        state.debts = [];

        window.location.href = "/dashboard";

    } catch (error) {

        console.error(
            "Signup failed:",
            error
        );

        showAuthError(
            "signup",
            error.message ||
            "Something went wrong while creating your account."
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                originalText ||
                "Create Account";
        }
    }
}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {

    event.preventDefault();

    clearAuthErrors();

    const email =
        $("loginEmail")
            ?.value
            .trim();

    const password =
        $("loginPassword")
            ?.value;

    if (!email || !password) {

        showAuthError(
            "login",
            "Please enter your email and password."
        );

        return;
    }

    const button =
        $("loginForm")
            ?.querySelector(".auth-submit");

    const originalText =
        button?.textContent;

    if (button) {

        button.disabled = true;
        button.textContent = "Logging in...";
    }

    try {

        const result =
            await apiRequest(
                "/api/login",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            email,
                            password
                        })
                }
            );

        state.mode = "account";

        state.user = result.user || null;

        localStorage.setItem(
            "moneyRootMode",
            "account"
        );

        if (result.user) {

            localStorage.setItem(
                "moneyRootUser",
                JSON.stringify(result.user)
            );
        }

        window.location.href = "/dashboard";

    } catch (error) {

        console.error(
            "Login failed:",
            error
        );

        showAuthError(
            "login",
            error.message ||
            "Unable to log in."
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                originalText ||
                "Log In";
        }
    }
}


// ============================================================
// APP INITIALIZATION
// ============================================================

async function initializeApp() {

    const isDashboard =
        window.location.pathname === "/dashboard" ||
        Boolean($("dashboard"));

    if (isDashboard) {

        await initializeDashboard();

    } else {

        initializeLandingPage();
    }
}


function initializeLandingPage() {

    closeGetStarted();
    closeAuth();

    console.log(
        "MoneyRoot landing page loaded."
    );
}


async function initializeDashboard() {

    setupNavigation();

    setupDashboardEvents();

    setupModalEvents();

    setupSearchAndFilters();

    setupTheme();

    setDefaultDates();

    try {

        const result =
            await apiRequest("/api/me");

        if (
            result.logged_in &&
            result.user
        ) {

            state.mode = "account";

            state.user = result.user;

            localStorage.setItem(
                "moneyRootMode",
                "account"
            );

            localStorage.setItem(
                "moneyRootUser",
                JSON.stringify(result.user)
            );

            await loadAccountData();

            updateAccountDisplay();

            renderEverything();

            return;
        }

    } catch (error) {

        console.error(
            "Could not check login:",
            error
        );
    }


    if (
        localStorage.getItem(
            "moneyRootMode"
        ) === "guest"
    ) {

        state.mode = "guest";

        state.user = {
            name: "Guest",
            email: ""
        };

        const data = getGuestData();

        state.transactions = data.transactions;
        state.budgets = data.budgets;
        state.goals = data.goals;
        state.debts = data.debts;

        updateAccountDisplay();

        renderEverything();

        return;
    }


    window.location.href = "/";
}


// ============================================================
// ACCOUNT DISPLAY
// ============================================================

function updateAccountDisplay() {

    const nameElement = $("accountName");
    const emailElement = $("accountEmail");
    const initialElement = $("accountInitial");

    if (state.mode === "guest") {

        if (nameElement) {
            nameElement.textContent = "Guest";
        }

        if (emailElement) {
            emailElement.textContent = "Guest Mode";
        }

        if (initialElement) {
            initialElement.textContent = "G";
        }

        return;
    }

    const name =
        state.user?.name ||
        "Account";

    const email =
        state.user?.email ||
        "";

    if (nameElement) {
        nameElement.textContent = name;
    }

    if (emailElement) {
        emailElement.textContent = email;
    }

    if (initialElement) {

        initialElement.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }
}


// ============================================================
// LOAD ACCOUNT DATA
// ============================================================

async function loadAccountData() {

    try {

        const [
            transactions,
            budgets,
            goals,
            debts
        ] = await Promise.all([

            apiRequest("/api/transactions"),

            apiRequest("/api/budgets"),

            apiRequest("/api/goals"),

            apiRequest("/api/debts")
        ]);

        state.transactions =
            Array.isArray(transactions)
                ? transactions
                : [];

        state.budgets =
            Array.isArray(budgets)
                ? budgets
                : [];

        state.goals =
            Array.isArray(goals)
                ? goals
                : [];

        state.debts =
            Array.isArray(debts)
                ? debts
                : [];

    } catch (error) {

        console.error(
            "Could not load account data:",
            error
        );

        localStorage.removeItem(
            "moneyRootMode"
        );

        localStorage.removeItem(
            "moneyRootUser"
        );

        window.location.href = "/";
    }
}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const section =
                        button.dataset.section;

                    if (section) {
                        showSection(section);
                    }
                }
            );
        });
}


function showSection(sectionName) {

    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.remove("active");
        });


    const target = $(sectionName);

    if (target) {
        target.classList.add("active");
    }


    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section === sectionName
            );
        });


    const titles = {

        dashboard: "Dashboard",

        transactions: "Transactions",

        budget: "Budget",

        goals: "Goals",

        debt: "Debt",

        analytics: "Analytics",

        resources: "Resources"
    };


    if ($("pageTitle")) {

        $("pageTitle").textContent =
            titles[sectionName] ||
            "Dashboard";
    }


    if (sectionName === "analytics") {

        setTimeout(
            renderCharts,
            50
        );
    }
}


// ============================================================
// DASHBOARD EVENTS
// ============================================================

function setupDashboardEvents() {

    $("addTransactionBtn")
        ?.addEventListener(
            "click",
            () => openTransactionModal()
        );

    $("addTransactionBtn2")
        ?.addEventListener(
            "click",
            () => openTransactionModal()
        );

    $("addBudgetBtn")
        ?.addEventListener(
            "click",
            () => openBudgetModal()
        );

    $("addGoalBtn")
        ?.addEventListener(
            "click",
            () => openGoalModal()
        );

    $("addDebtBtn")
        ?.addEventListener(
            "click",
            () => openDebtModal()
        );

    $("logoutBtn")
        ?.addEventListener(
            "click",
            handleLogout
        );

    $("transactionForm")
        ?.addEventListener(
            "submit",
            handleTransactionSubmit
        );

    $("budgetForm")
        ?.addEventListener(
            "submit",
            handleBudgetSubmit
        );

    $("goalForm")
        ?.addEventListener(
            "submit",
            handleGoalSubmit
        );

    $("debtForm")
        ?.addEventListener(
            "submit",
            handleDebtSubmit
        );
}


// ============================================================
// MODALS
// ============================================================

function setupModalEvents() {

    document
        .querySelectorAll("[data-close-modal]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.closeModal
                    );
                }
            );
        });


    document
        .querySelectorAll(".modal-overlay")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        modal.classList.remove(
                            "active"
                        );

                        document.body.style.overflow = "";
                    }
                }
            );
        });


    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            document
                .querySelectorAll(
                    ".modal-overlay.active"
                )
                .forEach(modal => {

                    modal.classList.remove(
                        "active"
                    );
                });

            document.body.style.overflow = "";
        }
    );
}


function openModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.add("active");

    document.body.style.overflow = "hidden";
}


function closeModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.remove("active");

    if (
        !document.querySelector(
            ".modal-overlay.active"
        )
    ) {

        document.body.style.overflow = "";
    }
}


// ============================================================
// TRANSACTIONS
// ============================================================

function openTransactionModal(transaction = null) {

    state.editingTransactionId =
        transaction?.id ||
        null;

    if ($("transactionModalTitle")) {

        $("transactionModalTitle").textContent =
            transaction
                ? "Edit transaction"
                : "Add transaction";
    }

    if ($("transactionId")) {

        $("transactionId").value =
            transaction?.id ||
            "";
    }

    if ($("transactionDescription")) {

        $("transactionDescription").value =
            transaction?.name ||
            transaction?.description ||
            "";
    }

    if ($("transactionAmount")) {

        $("transactionAmount").value =
            transaction?.amount ??
            "";
    }

    if ($("transactionType")) {

        $("transactionType").value =
            transaction?.type ||
            "expense";
    }

    if ($("transactionCategory")) {

        $("transactionCategory").value =
            transaction?.category ||
            "Other";
    }

    if ($("transactionDate")) {

        $("transactionDate").value =
            transaction?.date ||
            todayString();
    }

    openModal("transactionModal");
}


async function handleTransactionSubmit(event) {

    event.preventDefault();

    const name =
        $("transactionDescription")
            ?.value
            .trim();

    const amount =
        Number(
            $("transactionAmount")
                ?.value
        );

    const type =
        $("transactionType")
            ?.value;

    const category =
        $("transactionCategory")
            ?.value;

    const date =
        $("transactionDate")
            ?.value;


    if (
        !name ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !type ||
        !date
    ) {

        alert(
            "Please complete the transaction fields."
        );

        return;
    }


    const payload = {
        name,
        amount,
        type,
        category,
        date
    };


    try {

        if (state.mode === "guest") {

            if (state.editingTransactionId) {

                const index =
                    state.transactions.findIndex(
                        item =>
                            String(item.id) ===
                            String(
                                state.editingTransactionId
                            )
                    );

                if (index !== -1) {

                    state.transactions[index] = {
                        ...state.transactions[index],
                        ...payload
                    };
                }

            } else {

                state.transactions.unshift({
                    id: Date.now(),
                    ...payload
                });
            }

            saveGuestData();

        } else {

            if (state.editingTransactionId) {

                const oldId =
                    state.editingTransactionId;

                await apiRequest(
                    `/api/transactions/${oldId}`,
                    {
                        method: "DELETE"
                    }
                );

                const created =
                    await apiRequest(
                        "/api/transactions",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.transactions =
                    state.transactions.filter(
                        item =>
                            String(item.id) !==
                            String(oldId)
                    );

                state.transactions.unshift(
                    created
                );

            } else {

                const created =
                    await apiRequest(
                        "/api/transactions",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.transactions.unshift(
                    created
                );
            }
        }


        closeModal("transactionModal");

        formReset("transactionForm");

        state.editingTransactionId = null;

        renderEverything();

    } catch (error) {

        console.error(
            "Transaction error:",
            error
        );

        alert(
            error.message ||
            "Could not save transaction."
        );
    }
}


function editTransaction(transaction) {

    openTransactionModal(transaction);
}


async function deleteTransaction(id) {

    if (
        !confirm(
            "Delete this transaction?"
        )
    ) {
        return;
    }

    try {

        if (state.mode === "guest") {

            state.transactions =
                state.transactions.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

            saveGuestData();

        } else {

            await apiRequest(
                `/api/transactions/${id}`,
                {
                    method: "DELETE"
                }
            );

            state.transactions =
                state.transactions.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );
        }

        renderEverything();

    } catch (error) {

        alert(
            error.message ||
            "Could not delete transaction."
        );
    }
}


// ============================================================
// BUDGETS
// ============================================================

function getBudgetAmount(budget) {

    return Number(
        budget?.amount ??
        budget?.limit ??
        budget?.monthly_limit ??
        0
    );
}


function openBudgetModal(budget = null) {

    state.editingBudgetId =
        budget?.id ||
        null;

    if ($("budgetId")) {

        $("budgetId").value =
            budget?.id ||
            "";
    }

    if ($("budgetCategory")) {

        $("budgetCategory").value =
            budget?.category ||
            "Housing";
    }

    if ($("budgetAmount")) {

        $("budgetAmount").value =
            budget
                ? getBudgetAmount(budget)
                : "";
    }

    const title =
        document.querySelector(
            "#budgetModal h2"
        );

    if (title) {

        title.textContent =
            budget
                ? "Edit budget"
                : "Add budget";
    }

    openModal("budgetModal");
}


async function handleBudgetSubmit(event) {

    event.preventDefault();

    // --------------------------------------------------------
    // GET FORM VALUES
    // --------------------------------------------------------

    const categoryElement =
        $("budgetCategory");

    const amountElement =
        $("budgetAmount");


    if (
        !categoryElement ||
        !amountElement
    ) {

        console.error(
            "Budget form elements were not found."
        );

        alert(
            "There was a problem with the budget form."
        );

        return;
    }


    const category =
        categoryElement.value.trim();

    const amountText =
        amountElement.value.trim();

    const amount =
        Number(amountText);


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!category) {

        alert(
            "Please select a budget category."
        );

        return;
    }


    if (
        amountText === "" ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a budget amount greater than $0."
        );

        return;
    }


    const payload = {
        category: category,
        amount: amount
    };


    console.log(
        "Saving budget:",
        payload
    );


    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    try {

        // ====================================================
        // GUEST MODE
        // ====================================================

        if (state.mode === "guest") {

            if (state.editingBudgetId) {

                const index =
                    state.budgets.findIndex(
                        budget =>
                            String(budget.id) ===
                            String(
                                state.editingBudgetId
                            )
                    );

                if (index !== -1) {

                    state.budgets[index] = {
                        ...state.budgets[index],
                        category: category,
                        amount: amount
                    };
                }

            } else {

                state.budgets.push({
                    id: Date.now(),
                    category: category,
                    amount: amount
                });
            }

            saveGuestData();
        }

        // ====================================================
        // ACCOUNT MODE
        // ====================================================

        else {

            if (state.editingBudgetId) {

                const oldId =
                    state.editingBudgetId;

                // Delete old budget
                await apiRequest(
                    `/api/budgets/${oldId}`,
                    {
                        method: "DELETE"
                    }
                );

                // Create replacement budget
                const created =
                    await apiRequest(
                        "/api/budgets",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                // Remove old version
                state.budgets =
                    state.budgets.filter(
                        budget =>
                            String(budget.id) !==
                            String(oldId)
                    );

                // Add new version
                state.budgets.push(created);

            } else {

                const created =
                    await apiRequest(
                        "/api/budgets",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.budgets.push(created);
            }
        }


        // ----------------------------------------------------
        // RESET
        // ----------------------------------------------------

        closeModal("budgetModal");

        formReset("budgetForm");

        state.editingBudgetId = null;

        renderEverything();

    } catch (error) {

        console.error(
            "Budget error:",
            error
        );

        alert(
            error.message ||
            "Could not save budget."
        );
    }
}


function editBudget(budget) {

    openBudgetModal(budget);
}


async function deleteBudget(id) {

    if (
        !confirm(
            "Delete this budget?"
        )
    ) {
        return;
    }

    try {

        if (state.mode === "guest") {

            state.budgets =
                state.budgets.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

            saveGuestData();

        } else {

            await apiRequest(
                `/api/budgets/${id}`,
                {
                    method: "DELETE"
                }
            );

            state.budgets =
                state.budgets.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );
        }

        renderEverything();

    } catch (error) {

        alert(
            error.message ||
            "Could not delete budget."
        );
    }
}


// ============================================================
// GOALS
// ============================================================

function getGoalTarget(goal) {

    return Number(
        goal?.target ??
        goal?.target_amount ??
        0
    );
}


function getGoalCurrent(goal) {

    return Number(
        goal?.current ??
        goal?.current_amount ??
        0
    );
}


function openGoalModal(goal = null) {

    state.editingGoalId =
        goal?.id ||
        null;

    if ($("goalId")) {

        $("goalId").value =
            goal?.id ||
            "";
    }

    if ($("goalName")) {

        $("goalName").value =
            goal?.name ||
            "";
    }

    if ($("goalTarget")) {

        $("goalTarget").value =
            goal?.target ??
            goal?.target_amount ??
            "";
    }

    if ($("goalCurrent")) {

        $("goalCurrent").value =
            goal?.current ??
            goal?.current_amount ??
            0;
    }

    if ($("goalMonthly")) {

        $("goalMonthly").value =
            goal?.monthly ??
            goal?.monthly_contribution ??
            0;
    }

    const title =
        document.querySelector(
            "#goalModal h2"
        );

    if (title) {

        title.textContent =
            goal
                ? "Edit goal"
                : "Add goal";
    }

    openModal("goalModal");
}


async function handleGoalSubmit(event) {

    event.preventDefault();

    const name =
        $("goalName")
            ?.value
            .trim();

    const target =
        Number(
            $("goalTarget")
                ?.value
        );

    const current =
        Number(
            $("goalCurrent")
                ?.value
        ) || 0;

    const monthly =
        Number(
            $("goalMonthly")
                ?.value
        ) || 0;


    if (
        !name ||
        !Number.isFinite(target) ||
        target <= 0
    ) {

        alert(
            "Please enter a valid savings goal."
        );

        return;
    }


    const payload = {
        name,
        target,
        current,
        monthly
    };


    try {

        if (state.mode === "guest") {

            if (state.editingGoalId) {

                const index =
                    state.goals.findIndex(
                        item =>
                            String(item.id) ===
                            String(
                                state.editingGoalId
                            )
                    );

                if (index !== -1) {

                    state.goals[index] = {
                        ...state.goals[index],
                        ...payload
                    };
                }

            } else {

                state.goals.push({
                    id: Date.now(),
                    ...payload
                });
            }

            saveGuestData();

        } else {

            if (state.editingGoalId) {

                const oldId =
                    state.editingGoalId;

                await apiRequest(
                    `/api/goals/${oldId}`,
                    {
                        method: "DELETE"
                    }
                );

                const created =
                    await apiRequest(
                        "/api/goals",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.goals =
                    state.goals.filter(
                        item =>
                            String(item.id) !==
                            String(oldId)
                    );

                state.goals.push(created);

            } else {

                const created =
                    await apiRequest(
                        "/api/goals",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.goals.push(created);
            }
        }


        closeModal("goalModal");

        formReset("goalForm");

        state.editingGoalId = null;

        renderEverything();

    } catch (error) {

        console.error(
            "Goal error:",
            error
        );

        alert(
            error.message ||
            "Could not save goal."
        );
    }
}


function editGoal(goal) {

    openGoalModal(goal);
}


async function deleteGoal(id) {

    if (
        !confirm(
            "Delete this goal?"
        )
    ) {
        return;
    }

    try {

        if (state.mode === "guest") {

            state.goals =
                state.goals.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

            saveGuestData();

        } else {

            await apiRequest(
                `/api/goals/${id}`,
                {
                    method: "DELETE"
                }
            );

            state.goals =
                state.goals.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );
        }

        renderEverything();

    } catch (error) {

        alert(
            error.message ||
            "Could not delete goal."
        );
    }
}


// ============================================================
// DEBT
// ============================================================

function openDebtModal(debt = null) {

    state.editingDebtId =
        debt?.id ||
        null;

    if ($("debtId")) {

        $("debtId").value =
            debt?.id ||
            "";
    }

    if ($("debtName")) {

        $("debtName").value =
            debt?.name ||
            "";
    }

    if ($("debtBalance")) {

        $("debtBalance").value =
            debt?.balance ??
            debt?.amount ??
            "";
    }

    if ($("debtApr")) {

        $("debtApr").value =
            debt?.apr ??
            debt?.interest_rate ??
            "";
    }

    if ($("debtMinimum")) {

        $("debtMinimum").value =
            debt?.minimum ??
            debt?.minimum_payment ??
            "";
    }

    const title =
        document.querySelector(
            "#debtModal h2"
        );

    if (title) {

        title.textContent =
            debt
                ? "Edit debt"
                : "Add debt";
    }

    openModal("debtModal");
}


async function handleDebtSubmit(event) {

    event.preventDefault();

    const name =
        $("debtName")
            ?.value
            .trim();

    const balance =
        Number(
            $("debtBalance")
                ?.value
        );

    const apr =
        Number(
            $("debtApr")
                ?.value
        ) || 0;

    const minimum =
        Number(
            $("debtMinimum")
                ?.value
        ) || 0;


    if (
        !name ||
        !Number.isFinite(balance) ||
        balance < 0
    ) {

        alert(
            "Please enter valid debt information."
        );

        return;
    }


    const payload = {
        name,
        balance,
        apr,
        minimum
    };


    try {

        if (state.mode === "guest") {

            if (state.editingDebtId) {

                const index =
                    state.debts.findIndex(
                        item =>
                            String(item.id) ===
                            String(
                                state.editingDebtId
                            )
                    );

                if (index !== -1) {

                    state.debts[index] = {
                        ...state.debts[index],
                        ...payload
                    };
                }

            } else {

                state.debts.push({
                    id: Date.now(),
                    ...payload
                });
            }

            saveGuestData();

        } else {

            if (state.editingDebtId) {

                const oldId =
                    state.editingDebtId;

                await apiRequest(
                    `/api/debts/${oldId}`,
                    {
                        method: "DELETE"
                    }
                );

                const created =
                    await apiRequest(
                        "/api/debts",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.debts =
                    state.debts.filter(
                        item =>
                            String(item.id) !==
                            String(oldId)
                    );

                state.debts.push(created);

            } else {

                const created =
                    await apiRequest(
                        "/api/debts",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                state.debts.push(created);
            }
        }


        closeModal("debtModal");

        formReset("debtForm");

        state.editingDebtId = null;

        renderEverything();

    } catch (error) {

        console.error(
            "Debt error:",
            error
        );

        alert(
            error.message ||
            "Could not save debt."
        );
    }
}


function editDebt(debt) {

    openDebtModal(debt);
}


async function deleteDebt(id) {

    if (
        !confirm(
            "Delete this debt?"
        )
    ) {
        return;
    }

    try {

        if (state.mode === "guest") {

            state.debts =
                state.debts.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

            saveGuestData();

        } else {

            await apiRequest(
                `/api/debts/${id}`,
                {
                    method: "DELETE"
                }
            );

            state.debts =
                state.debts.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );
        }

        renderEverything();

    } catch (error) {

        alert(
            error.message ||
            "Could not delete debt."
        );
    }
}


// ============================================================
// RENDERING
// ============================================================

function renderEverything() {

    updateDashboardStats();

    renderTransactions();

    renderDashboardTransactions();

    renderBudgets();

    renderGoals();

    renderDashboardGoals();

    renderDebts();

    renderAnalyticsInsights();

    renderCharts();
}


// ============================================================
// TRANSACTION HELPERS
// ============================================================

function getTransactionAmount(transaction) {

    return Number(
        transaction?.amount ||
        0
    );
}


function getTransactionType(transaction) {

    return (
        transaction?.type ||
        "expense"
    ).toLowerCase();
}


function getTransactionCategory(transaction) {

    return (
        transaction?.category ||
        "Other"
    );
}


function getTransactionDescription(transaction) {

    return (
        transaction?.name ||
        transaction?.description ||
        "Transaction"
    );
}


function getTransactionDate(transaction) {

    return (
        transaction?.date ||
        ""
    );
}


// ============================================================
// DASHBOARD STATS
// ============================================================

function updateDashboardStats() {

    const income =
        state.transactions
            .filter(
                item =>
                    getTransactionType(item) ===
                    "income"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    getTransactionAmount(item),
                0
            );


    const expenses =
        state.transactions
            .filter(
                item =>
                    getTransactionType(item) ===
                    "expense"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    getTransactionAmount(item),
                0
            );


    const debt =
        state.debts.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.balance ??
                    item.amount ??
                    0
                ),
            0
        );


    const available =
        income -
        expenses;


    if ($("incomeStat")) {

        $("incomeStat").textContent =
            formatCurrency(income);
    }

    if ($("expenseStat")) {

        $("expenseStat").textContent =
            formatCurrency(expenses);
    }

    if ($("availableStat")) {

        $("availableStat").textContent =
            formatCurrency(available);
    }

    if ($("debtStat")) {

        $("debtStat").textContent =
            formatCurrency(debt);
    }
}


// ============================================================
// TRANSACTION RENDERING
// ============================================================

function renderTransactions() {

    const container =
        $("transactionList");

    if (!container) return;


    const search =
        $("transactionSearch")
            ?.value
            .trim()
            .toLowerCase() ||
        "";


    const filter =
        $("transactionFilter")
            ?.value ||
        "all";


    let transactions = [
        ...state.transactions
    ];


    if (search) {

        transactions =
            transactions.filter(
                transaction => {

                    const text =
                        `${getTransactionDescription(
                            transaction
                        )} ${getTransactionCategory(
                            transaction
                        )} ${getTransactionDate(
                            transaction
                        )}`.toLowerCase();

                    return text.includes(search);
                }
            );
    }


    if (filter !== "all") {

        transactions =
            transactions.filter(
                transaction =>
                    getTransactionType(
                        transaction
                    ) === filter
            );
    }


    transactions.sort(
        (a, b) =>
            new Date(
                getTransactionDate(b)
            ) -
            new Date(
                getTransactionDate(a)
            )
    );


    if (!transactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                No transactions found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        transactions
            .map(
                transaction => {

                    const type =
                        getTransactionType(
                            transaction
                        );

                    const amount =
                        getTransactionAmount(
                            transaction
                        );

                    const sign =
                        type === "income"
                            ? "+"
                            : "-";


                    return `
                        <div class="transaction-row">

                            <div class="transaction-main">

                                <div class="transaction-icon">
                                    ${
                                        type === "income"
                                            ? "↑"
                                            : "↓"
                                    }
                                </div>

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            getTransactionDescription(
                                                transaction
                                            )
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            getTransactionCategory(
                                                transaction
                                            )
                                        )}
                                        ·
                                        ${escapeHtml(
                                            getTransactionDate(
                                                transaction
                                            )
                                        )}
                                    </small>

                                </div>

                            </div>

                            <div class="transaction-amount ${type}">
                                ${sign}${formatCurrency(
                                    amount
                                )}
                            </div>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    onclick='editTransaction(${JSON.stringify(
                                        transaction
                                    )})'>
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onclick="deleteTransaction('${transaction.id}')">
                                    Delete
                                </button>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


function renderDashboardTransactions() {

    const container =
        $("dashboardTransactions");

    if (!container) return;


    const transactions =
        [...state.transactions]
            .sort(
                (a, b) =>
                    new Date(
                        getTransactionDate(b)
                    ) -
                    new Date(
                        getTransactionDate(a)
                    )
            )
            .slice(0, 5);


    if (!transactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                No transactions yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        transactions
            .map(
                transaction => {

                    const type =
                        getTransactionType(
                            transaction
                        );

                    const sign =
                        type === "income"
                            ? "+"
                            : "-";


                    return `
                        <div class="mini-row">

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        getTransactionDescription(
                                            transaction
                                        )
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        getTransactionCategory(
                                            transaction
                                        )
                                    )}
                                </small>

                            </div>

                            <strong class="${type}">
                                ${sign}${formatCurrency(
                                    getTransactionAmount(
                                        transaction
                                    )
                                )}
                            </strong>

                        </div>
                    `;
                }
            )
            .join("");
}


// ============================================================
// BUDGET RENDERING
// ============================================================

function renderBudgets() {

    const container =
        $("budgetCards");

    if (!container) return;


    if (!state.budgets.length) {

        container.innerHTML = `
            <div class="empty-state">
                No budgets yet. Add your first budget.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.budgets
            .map(
                budget => {

                    const category =
                        budget.category ||
                        "Other";

                    const limit =
                        getBudgetAmount(
                            budget
                        );

                    const spent =
                        state.transactions
                            .filter(
                                transaction =>
                                    getTransactionType(
                                        transaction
                                    ) === "expense" &&
                                    getTransactionCategory(
                                        transaction
                                    ) === category
                            )
                            .reduce(
                                (sum, transaction) =>
                                    sum +
                                    getTransactionAmount(
                                        transaction
                                    ),
                                0
                            );

                    const percentage =
                        limit > 0
                            ? Math.min(
                                (spent / limit) * 100,
                                100
                            )
                            : 0;


                    return `
                        <article class="budget-card">

                            <div class="budget-card-header">

                                <div>

                                    <span class="budget-category">
                                        ${escapeHtml(
                                            category
                                        )}
                                    </span>

                                    <h3>
                                        ${formatCurrency(
                                            spent
                                        )}
                                    </h3>

                                </div>

                                <span>
                                    ${formatCurrency(
                                        limit
                                    )}
                                </span>

                            </div>

                            <div class="progress-track">

                                <div
                                    class="progress-bar"
                                    style="width:${percentage}%">
                                </div>

                            </div>

                            <div class="budget-card-footer">

                                <span>
                                    ${percentage.toFixed(
                                        0
                                    )}% used
                                </span>

                                <div class="row-actions">

                                    <button
                                        type="button"
                                        onclick='editBudget(${JSON.stringify(
                                            budget
                                        )})'>
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onclick="deleteBudget('${budget.id}')">
                                        Delete
                                    </button>

                                </div>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


// ============================================================
// GOAL RENDERING
// ============================================================

function renderGoals() {

    const container =
        $("goalCards");

    if (!container) return;


    if (!state.goals.length) {

        container.innerHTML = `
            <div class="empty-state">
                No savings goals yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.goals
            .map(
                goal => {

                    const target =
                        getGoalTarget(goal);

                    const current =
                        getGoalCurrent(goal);

                    const percentage =
                        target > 0
                            ? Math.min(
                                (current / target) * 100,
                                100
                            )
                            : 0;


                    return `
                        <article class="goal-card">

                            <div class="goal-header">

                                <div>

                                    <span class="goal-label">
                                        SAVINGS GOAL
                                    </span>

                                    <h3>
                                        ${escapeHtml(
                                            goal.name ||
                                            "Goal"
                                        )}
                                    </h3>

                                </div>

                                <strong>
                                    ${percentage.toFixed(
                                        0
                                    )}%
                                </strong>

                            </div>

                            <div class="progress-track">

                                <div
                                    class="progress-bar"
                                    style="width:${percentage}%">
                                </div>

                            </div>

                            <div class="goal-amounts">

                                <span>
                                    ${formatCurrency(
                                        current
                                    )}
                                </span>

                                <span>
                                    ${formatCurrency(
                                        target
                                    )}
                                </span>

                            </div>

                            <div class="goal-footer">

                                <span>
                                    Monthly:
                                    ${formatCurrency(
                                        Number(
                                            goal.monthly ||
                                            goal.monthly_contribution ||
                                            0
                                        )
                                    )}
                                </span>

                                <div class="row-actions">

                                    <button
                                        type="button"
                                        onclick='editGoal(${JSON.stringify(
                                            goal
                                        )})'>
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onclick="deleteGoal('${goal.id}')">
                                        Delete
                                    </button>

                                </div>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


function renderDashboardGoals() {

    const container =
        $("dashboardGoals");

    if (!container) return;


    const goals =
        state.goals.slice(0, 4);


    if (!goals.length) {

        container.innerHTML = `
            <div class="empty-state">
                No savings goals yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        goals
            .map(
                goal => {

                    const target =
                        getGoalTarget(goal);

                    const current =
                        getGoalCurrent(goal);

                    const percentage =
                        target > 0
                            ? Math.min(
                                (current / target) * 100,
                                100
                            )
                            : 0;


                    return `
                        <div class="goal-mini">

                            <div class="mini-row">

                                <strong>
                                    ${escapeHtml(
                                        goal.name ||
                                        "Goal"
                                    )}
                                </strong>

                                <span>
                                    ${percentage.toFixed(
                                        0
                                    )}%
                                </span>

                            </div>

                            <div class="progress-track">

                                <div
                                    class="progress-bar"
                                    style="width:${percentage}%">
                                </div>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


// ============================================================
// DEBT RENDERING
// ============================================================

function renderDebts() {

    const container =
        $("debtList");

    if (!container) return;


    if (!state.debts.length) {

        container.innerHTML = `
            <div class="empty-state">
                No debts added yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        state.debts
            .map(
                debt => {

                    const balance =
                        Number(
                            debt.balance ??
                            debt.amount ??
                            0
                        );

                    const apr =
                        Number(
                            debt.apr ??
                            debt.interest_rate ??
                            0
                        );

                    const minimum =
                        Number(
                            debt.minimum ??
                            debt.minimum_payment ??
                            0
                        );


                    return `
                        <article class="debt-row">

                            <div class="debt-main">

                                <strong>
                                    ${escapeHtml(
                                        debt.name ||
                                        "Debt"
                                    )}
                                </strong>

                                <small>
                                    ${apr.toFixed(
                                        2
                                    )}% APR
                                    · Minimum
                                    ${formatCurrency(
                                        minimum
                                    )}
                                </small>

                            </div>

                            <strong class="debt-balance">
                                ${formatCurrency(
                                    balance
                                )}
                            </strong>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    onclick='editDebt(${JSON.stringify(
                                        debt
                                    )})'>
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onclick="deleteDebt('${debt.id}')">
                                    Delete
                                </button>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


// ============================================================
// ANALYTICS
// ============================================================

function renderAnalyticsInsights() {

    const container =
        $("analyticsInsights");

    if (!container) return;


    if (!state.transactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                Add transactions to start seeing insights.
            </div>
        `;

        return;
    }


    const income =
        state.transactions
            .filter(
                item =>
                    getTransactionType(item) ===
                    "income"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    getTransactionAmount(item),
                0
            );


    const expenses =
        state.transactions
            .filter(
                item =>
                    getTransactionType(item) ===
                    "expense"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    getTransactionAmount(item),
                0
            );


    const categories = {};


    state.transactions
        .filter(
            item =>
                getTransactionType(item) ===
                "expense"
        )
        .forEach(
            item => {

                const category =
                    getTransactionCategory(item);

                categories[category] =
                    (
                        categories[category] ||
                        0
                    ) +
                    getTransactionAmount(item);
            }
        );


    const topCategory =
        Object.entries(categories)
            .sort(
                (a, b) =>
                    b[1] -
                    a[1]
            )[0];


    const savingsRate =
        income > 0
            ? (
                (
                    income -
                    expenses
                ) /
                income
            ) * 100
            : 0;


    const insights = [];


    insights.push(
        `You currently have ${formatCurrency(
            income - expenses
        )} available after recorded expenses.`
    );


    if (topCategory) {

        insights.push(
            `${topCategory[0]} is your largest spending category at ${formatCurrency(
                topCategory[1]
            )}.`
        );
    }


    if (income > 0) {

        insights.push(
            `Your current recorded savings rate is approximately ${savingsRate.toFixed(
                1
            )}%.`
        );
    }


    container.innerHTML =
        insights
            .map(
                insight => `
                    <div class="insight-item">

                        <span>•</span>

                        <p>
                            ${escapeHtml(
                                insight
                            )}
                        </p>

                    </div>
                `
            )
            .join("");
}


// ============================================================
// CHARTS
// ============================================================

function renderCharts() {

    if (typeof Chart === "undefined") {
        return;
    }

    renderCategoryChart();

    renderBudgetChart();

    renderIncomeExpenseChart();

    renderAnalyticsCategoryChart();
}


function renderCategoryChart() {

    const canvas =
        $("categoryChart");

    if (!canvas) return;


    const totals = {};


    state.transactions
        .filter(
            item =>
                getTransactionType(item) ===
                "expense"
        )
        .forEach(
            item => {

                const category =
                    getTransactionCategory(item);

                totals[category] =
                    (
                        totals[category] ||
                        0
                    ) +
                    getTransactionAmount(item);
            }
        );


    if (state.charts.category) {

        state.charts.category.destroy();
    }


    state.charts.category =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels:
                        Object.keys(totals),

                    datasets: [
                        {
                            data:
                                Object.values(totals)
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }
                    }
                }
            }
        );
}


function renderBudgetChart() {

    const canvas =
        $("budgetChart");

    if (!canvas) return;


    const labels =
        state.budgets.map(
            budget =>
                budget.category ||
                "Other"
        );


    const limits =
        state.budgets.map(
            budget =>
                getBudgetAmount(budget)
        );


    const spent =
        state.budgets.map(
            budget => {

                const category =
                    budget.category ||
                    "Other";

                return state.transactions
                    .filter(
                        item =>
                            getTransactionType(item) ===
                            "expense" &&
                            getTransactionCategory(item) ===
                            category
                    )
                    .reduce(
                        (sum, item) =>
                            sum +
                            getTransactionAmount(item),
                        0
                    );
            }
        );


    if (state.charts.budget) {

        state.charts.budget.destroy();
    }


    state.charts.budget =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {
                            label: "Budget",
                            data: limits
                        },

                        {
                            label: "Spent",
                            data: spent
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );
}


function renderIncomeExpenseChart() {

    const canvas =
        $("incomeExpenseChart");

    if (!canvas) return;


    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];


    const income =
        new Array(12).fill(0);

    const expenses =
        new Array(12).fill(0);


    state.transactions.forEach(
        transaction => {

            const date =
                new Date(
                    getTransactionDate(
                        transaction
                    )
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return;
            }


            const month =
                date.getMonth();

            const amount =
                getTransactionAmount(
                    transaction
                );


            if (
                getTransactionType(
                    transaction
                ) === "income"
            ) {

                income[month] += amount;

            } else {

                expenses[month] += amount;
            }
        }
    );


    if (state.charts.incomeExpense) {

        state.charts.incomeExpense.destroy();
    }


    state.charts.incomeExpense =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels: months,

                    datasets: [

                        {
                            label: "Income",
                            data: income,
                            tension: 0.3
                        },

                        {
                            label: "Expenses",
                            data: expenses,
                            tension: 0.3
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"
                    },

                    scales: {

                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );
}


function renderAnalyticsCategoryChart() {

    const canvas =
        $("analyticsCategoryChart");

    if (!canvas) return;


    const totals = {};


    state.transactions
        .filter(
            item =>
                getTransactionType(item) ===
                "expense"
        )
        .forEach(
            item => {

                const category =
                    getTransactionCategory(item);

                totals[category] =
                    (
                        totals[category] ||
                        0
                    ) +
                    getTransactionAmount(item);
            }
        );


    if (state.charts.analyticsCategory) {

        state.charts.analyticsCategory.destroy();
    }


    state.charts.analyticsCategory =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        Object.keys(totals),

                    datasets: [

                        {
                            label: "Spending",

                            data:
                                Object.values(
                                    totals
                                )
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );
}


// ============================================================
// SEARCH
// ============================================================

function setupSearchAndFilters() {

    $("transactionSearch")
        ?.addEventListener(
            "input",
            renderTransactions
        );

    $("transactionFilter")
        ?.addEventListener(
            "change",
            renderTransactions
        );
}


// ============================================================
// THEME
// ============================================================

function setupTheme() {

    const button =
        $("themeBtn");

    if (!button) return;


    if (
        localStorage.getItem(
            "moneyRootTheme"
        ) === "dark"
    ) {

        document.body.classList.add("dark");
    }


    button.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

            localStorage.setItem(
                "moneyRootTheme",

                document.body.classList.contains(
                    "dark"
                )
                    ? "dark"
                    : "light"
            );
        }
    );
}


// ============================================================
// LOGOUT
// ============================================================

async function handleLogout() {

    try {

        if (state.mode === "account") {

            await apiRequest(
                "/api/logout",
                {
                    method: "POST"
                }
            );
        }

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );

    } finally {

        state.mode = "guest";

        state.user = null;

        localStorage.removeItem(
            "moneyRootMode"
        );

        localStorage.removeItem(
            "moneyRootUser"
        );

        window.location.href = "/";
    }
}


// ============================================================
// DEFAULT DATES
// ============================================================

function setDefaultDates() {

    const input =
        $("transactionDate");

    if (input && !input.value) {

        input.value =
            todayString();
    }
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);