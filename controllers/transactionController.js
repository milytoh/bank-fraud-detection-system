const db = require("../config/db");

// SHOW PAGE
exports.createPage = (req, res) => {
  const preType = req.query.type || "";
  const preAccount = req.query.account || "";

  const sql = `
        SELECT accounts.*, customers.fullname
        FROM accounts
        JOIN customers ON accounts.customer_id = customers.id
    `;

  db.query(sql, (err, accounts) => {
    if (err) {
      console.log(err);
      return res.send("Error loading accounts");
    }

    res.render("transactions/create", {
      user: req.session.user,
      accounts,
      preType,
      preAccount,
    });
  });
};

exports.processTransaction = (req, res) => {
  const { type, from_account, to_account, amount } = req.body;

  const amt = parseFloat(amount);

  if (!type || !amount) {
    req.flash("error", "All fields are required");
    return res.redirect("/transactions/create");
  }

  // =========================
  // 1. DEPOSIT
  // =========================
  if (type === "deposit") {
    // Check account status first
    db.query(
      "SELECT status FROM accounts WHERE id = ?",
      [from_account],
      (err, result) => {
        if (err || result.length === 0) {
          req.flash("error", "Account not found");
          return res.redirect("/transactions/create");
        }

        if (result[0].status === "blocked") {
          req.flash("error", "Account is blocked. Deposit not allowed.");

          return res.redirect("/transactions/create");
        }

        // Proceed with deposit
        const sql = `
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
      `;

        db.query(sql, [amt, from_account], (err) => {
          if (err) {
            console.log(err);
            req.flash("error", "Deposit failed");
            return res.redirect("/transactions/create");
          }

          saveTransaction(
            null,
            from_account,
            amt,
            "deposit",
            res,
            "Deposit successful",
            req,
          );
        });
      },
    );
  }

  // =========================
  // 2. WITHDRAW
  // =========================
  else if (type === "withdraw") {
    const checkSql = `
    SELECT balance, status
    FROM accounts
    WHERE id = ?
  `;

    db.query(checkSql, [from_account], (err, result) => {
      if (err || result.length === 0) {
        req.flash("error", "Account not found");
        return res.redirect("/transactions/create");
      }

      const account = result[0];

      // Check if account is blocked
      if (account.status === "blocked") {
        req.flash("error", "Account is blocked. Withdrawal not allowed.");

        return res.redirect("/transactions/create");
      }

      // Check balance
      if (account.balance < amt) {
        req.flash("error", "Insufficient balance");
        return res.redirect("/transactions/create");
      }

      const sql = `
      UPDATE accounts
      SET balance = balance - ?
      WHERE id = ?
    `;

      db.query(sql, [amt, from_account], (err) => {
        if (err) {
          req.flash("error", "Withdraw failed");
          return res.redirect("/transactions/create");
        }

        saveTransaction(
          from_account,
          null,
          amt,
          "withdraw",
          res,
          "Withdraw successful",
          req,
        );
      });
    });
  }

  // =========================
  // 3. TRANSFER
  // =========================
  else if (type === "transfer") {
    const checkSql = `
    SELECT id, balance, status
    FROM accounts
    WHERE id = ?
  `;

    // 1. Check source account
    db.query(checkSql, [from_account], (err, fromResult) => {
      if (err || fromResult.length === 0) {
        req.flash("error", "Source account not found");
        return res.redirect("/transactions/create");
      }

      const fromAcc = fromResult[0];

      // Block check (source)
      if (fromAcc.status === "blocked") {
        req.flash("error", "Source account is blocked");
        return res.redirect("/transactions/create");
      }

      // Balance check
      if (fromAcc.balance < amt) {
        req.flash("error", "Insufficient balance");
        return res.redirect("/transactions/create");
      }

      // 2. Check destination account
      db.query(checkSql, [to_account], (err, toResult) => {
        if (err || toResult.length === 0) {
          req.flash("error", "Destination account not found");
          return res.redirect("/transactions/create");
        }

        const toAcc = toResult[0];

        // Block check (destination)
        if (toAcc.status === "blocked") {
          req.flash("error", "Destination account is blocked");
          return res.redirect("/transactions/create");
        }

        // 3. Deduct from sender
        const deductSql = `
        UPDATE accounts
        SET balance = balance - ?
        WHERE id = ?
      `;

        db.query(deductSql, [amt, from_account], (err) => {
          if (err) {
            req.flash("error", "Transfer failed (debit error)");
            return res.redirect("/transactions/create");
          }

          // 4. Add to receiver
          const addSql = `
          UPDATE accounts
          SET balance = balance + ?
          WHERE id = ?
        `;

          db.query(addSql, [amt, to_account], (err) => {
            if (err) {
              req.flash("error", "Transfer failed (credit error)");
              return res.redirect("/transactions/create");
            }

            // 5. Save transaction
            saveTransaction(
              from_account,
              to_account,
              amt,
              "transfer",
              res,
              "Transfer successful",
              req,
            );
          });
        });
      });
    });
  }
};

function saveTransaction(from, to, amount, type, res, message, req) {
  const sql = `
        INSERT INTO transactions
        (from_account, to_account, amount, type, status)
        VALUES (?, ?, ?, ?, 'success')
    `;

  db.query(sql, [from, to, amount, type], (err, result) => {
    if (err) {
      console.log(err);
      req.flash("error", "Transaction save failed");
      return res.redirect("/transactions/create");
    }

    const transactionId = result.insertId;

    // 👉 CALL FRAUD DETECTION
    detectFraud(transactionId, from, to, amount, type);

    req.flash("success", message);
    return res.redirect("/transactions/create");
  });
}

/////fraud detection rules/////////////
function detectFraud(transactionId, fromAccount, toAccount, amount, type) {
  amount = Number(amount);

  const sourceAccount = fromAccount ? Number(fromAccount) : null;
  const destinationAccount = toAccount ? Number(toAccount) : null;

  let alerts = [];

  // RULE 1: Large transaction
  if (amount >= 500000) {
    alerts.push("Large transaction detected");
  }

  // RULE 2: Self transfer (ONLY for transfer)
  if (type === "transfer" && sourceAccount === destinationAccount) {
    alerts.push("Self transfer detected");
  }

  // RULE 3: Rapid transactions (track source account)
  const accountToCheck = sourceAccount || destinationAccount;

  if (!accountToCheck) return;

  const sql = `
SELECT COUNT(*) AS count
FROM transactions
WHERE (
    from_account = ?
    OR to_account = ?
)
AND created_at >= (NOW() - INTERVAL 1 MINUTE)
`;

  db.query(sql, [accountToCheck, accountToCheck], (err, result) => {
   

    if (result[0].count >= 3) {
      alerts.push("Rapid transactions detected");
    }

    saveAlerts(alerts, accountToCheck, transactionId);
  });
}

function saveAlerts(alerts, accountId, transactionId) {
  if (!alerts || alerts.length === 0) return;

  

  alerts.forEach((msg) => {
    const sql = `
            INSERT INTO alerts (account_id, transaction_id, message, level)
            VALUES (?, ?, ?, 'warning')
        `;

    db.query(sql, [accountId, transactionId, msg], (err) => {
      if (err) {
        console.log("❌ ALERT INSERT ERROR:", err);
      } else {
        console.log("✅ ALERT SAVED");
      }
    });
  });
}

exports.historyPage = (req, res) => {
  const sql = `
        SELECT 
            t.*,
            fa.account_number AS from_account_number,
            ta.account_number AS to_account_number
        FROM transactions t
        LEFT JOIN accounts fa ON t.from_account = fa.id
        LEFT JOIN accounts ta ON t.to_account = ta.id
        ORDER BY t.id DESC
    `;

  db.query(sql, (err, transactions) => {
    if (err) {
      console.log(err);
      return res.send("Error loading transactions");
    }

    res.render("transactions/history", {
      user: req.session.user,
      transactions,
    });
  });
};

exports.alertsPage = (req, res) => {
  const sql = `
        SELECT alerts.*, accounts.account_number
        FROM alerts
        JOIN accounts ON alerts.account_id = accounts.id
        ORDER BY alerts.id DESC
    `;

  db.query(sql, (err, alerts) => {
    if (err) return res.send("Error");

    res.render("alerts/index", {
      user: req.session.user,
      alerts,
    });
  });
};


exports.fraudDashboard = (req, res) => {
  const sql = `
        SELECT *
        FROM alerts
        ORDER BY created_at DESC
    `;

  db.query(sql, (err, alerts) => {
    if (err) {
      console.log(err);
      return res.send("Error loading dashboard");
    }

    const totalAlerts = alerts.length;

    const largeTransactions = alerts.filter((a) =>
      a.message.includes("Large transaction"),
    ).length;

    const rapidTransactions = alerts.filter((a) =>
      a.message.includes("Rapid"),
    ).length;

    const riskyAccounts = new Set(alerts.map((a) => a.account_id)).size;

    res.render("fraud/dashboard", {
      user: req.session.user,
      alerts,
      totalAlerts,
      largeTransactions,
      rapidTransactions,
      riskyAccounts,
    });
  });
};




exports.viewAlert = (req, res) => {
  const sql = `
    SELECT
      a.*,
      ac.account_number,
      c.fullname
    FROM alerts a
    LEFT JOIN accounts ac
      ON a.account_id = ac.id
    LEFT JOIN customers c
      ON ac.customer_id = c.id
    WHERE a.id = ?
  `;

  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.log(err);
      return res.redirect("/transactions/alerts");
    }

    res.render("alerts/view", {
      user: req.session.user,
      alert: result[0],
    });
  });
};


exports.reviewAlert = (req, res) => {
  db.query(
    "UPDATE alerts SET status = 'under_review' WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) {
        console.log(err);
        req.flash("error", "Failed to update alert");
        return res.redirect("/transactions/alerts");
      }

      req.flash("success", "Alert marked as under review");

      res.redirect(`/transactions/alerts/${req.params.id}`);
    },
  );
};

exports.resolveAlert = (req, res) => {
  db.query(
    "UPDATE alerts SET status='resolved' WHERE id=?",
    [req.params.id],
    () => {
      req.flash("success", "Alert resolved");
      res.redirect("/transactions/alerts");
    },
  );
};