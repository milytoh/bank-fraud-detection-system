const db = require("../config/db");
exports.dashboard = (req, res) => {
  const accountId = req.session.user.account_id;

  const balanceSql = `
    SELECT balance, account_number
    FROM accounts
    WHERE id = ?
  `;

  const txnSql = `
    SELECT *
    FROM transactions
    WHERE from_account = ? OR to_account = ?
    ORDER BY id DESC
    LIMIT 5
  `;

  const alertSql = `
    SELECT *
    FROM alerts
    WHERE account_id = ?
    ORDER BY id DESC
    LIMIT 5
  `;

  db.query(balanceSql, [accountId], (err, accResult) => {
    if (err || accResult.length === 0) {
      req.flash("error", "Account not found");
      return res.redirect("/auth/customer-login");
    }

    db.query(txnSql, [accountId, accountId], (err, txns) => {
      if (err) {
        txns = [];
      }

      db.query(alertSql, [accountId], (err, alerts) => {
        if (err) {
          alerts = [];
        }

        res.render("user/dashboard", {
          user: req.session.user,
          account: accResult[0],
          transactions: txns,
          alerts,
          customerIsAuthenticated:
            req.session.user && req.session.user.role === "customer"
              ? true
              : false,
          adminIsAuthenticated:
            req.session.user && req.session.user.role === "admin"
              ? true
              : false,
        });
      });
    });
  });
};

exports.transferPage = (req, res) => {
  res.render("user/transfer", { user: req.session.user });
};

exports.withdrawPage = (req, res) => {
  res.render("user/withdraw", { user: req.session.user });
};

exports.transfer = (req, res) => {
  const from_account = req.session.user.account_id;
  const recipientAccountNumber = req.body.to_account;
  const amount = Number(req.body.amount);

  const findRecipientSql = `
    SELECT id
    FROM accounts
    WHERE account_number = ?
  `;

  db.query(
    findRecipientSql,
    [recipientAccountNumber],
    (err, recipientResult) => {
      if (err) {
        req.flash("error", "Transfer failed");
        return res.redirect("/user/transfer");
      }

      if (recipientResult.length === 0) {
        req.flash("error", "Recipient account does not exist");
        return res.redirect("/user/transfer");
      }

      const recipientId = recipientResult[0].id;

      if (recipientId == from_account) {
        req.flash("error", "You cannot transfer to your own account");
        return res.redirect("/user/transfer");
      }

      const checkSql = `
        SELECT balance, status
        FROM accounts
        WHERE id = ?
      `;

      db.query(checkSql, [from_account], (err, result) => {
        if (err || result.length === 0) {
          req.flash("error", "Account not found");
          return res.redirect("/user/transfer");
        }

        // 🚫 BLOCKED ACCOUNT CHECK
        if (result[0].status === "blocked") {
          req.flash(
            "error",
            "Your account has been blocked. Please contact the administrator.",
          );

          return res.redirect("/user/dashboard");
        }

        const balance = Number(result[0].balance);

        if (balance < amount) {
          req.flash("error", "Insufficient balance");
          return res.redirect("/user/transfer");
        }

        const deductSql = `
          UPDATE accounts
          SET balance = balance - ?
          WHERE id = ?
        `;

        const addSql = `
          UPDATE accounts
          SET balance = balance + ?
          WHERE id = ?
        `;

        db.query(deductSql, [amount, from_account], (err) => {
          if (err) {
            req.flash("error", "Transfer failed");
            return res.redirect("/user/transfer");
          }

          db.query(addSql, [amount, recipientId], (err) => {
            if (err) {
              req.flash("error", "Transfer failed");
              return res.redirect("/user/transfer");
            }

            saveTransaction(
              from_account,
              recipientId,
              amount,
              "transfer",
              res,
              "Transfer successful",
              req,
            );
          });
        });
      });
    },
  );
};
exports.withdraw = (req, res) => {
  const from_account = req.session.user.account_id;
  const amount = Number(req.body.amount);

  const checkSql = `
    SELECT balance, status
    FROM accounts
    WHERE id = ?
  `;

  db.query(checkSql, [from_account], (err, result) => {
    if (err || result.length === 0) {
      req.flash("error", "Account not found");
      return res.redirect("/user/withdraw");
    }

    // 🚫 BLOCKED ACCOUNT CHECK
    if (result[0].status === "blocked") {
      req.flash(
        "error",
        "Your account has been blocked. Please contact the administrator.",
      );

      return res.redirect("/accounts/user/dashboard");
    }

    const balance = Number(result[0].balance);

    if (balance < amount) {
      req.flash("error", "Insufficient balance");
      return res.redirect("/user/withdraw");
    }

    const sql = `
      UPDATE accounts
      SET balance = balance - ?
      WHERE id = ?
    `;

    db.query(sql, [amount, from_account], (err) => {
      if (err) {
        req.flash("error", "Withdraw failed");
        return res.redirect("/user/withdraw");
      }

      saveTransaction(
        from_account,
        null,
        amount,
        "withdraw",
        res,
        "Withdraw successful",
        req,
      );
    });
  });
};

exports.depositPage = (req, res) => {
  res.render("user/deposit", { user: req.session.user });
};

exports.deposit = (req, res) => {
  const accountId = req.session.user.account_id;
  const amount = Number(req.body.amount);

  const checkSql = `
    SELECT status
    FROM accounts
    WHERE id = ?
  `;

  db.query(checkSql, [accountId], (err, result) => {
    if (err || result.length === 0) {
      req.flash("error", "Account not found");
      return res.redirect("/user/deposit");
    }

    // 🚫 BLOCKED ACCOUNT CHECK
    if (result[0].status === "blocked") {
      req.flash(
        "error",
        "Your account has been blocked. Please contact the administrator.",
      );

      return res.redirect("/accounts/user/dashboard");
    }

    const sql = `
      UPDATE accounts
      SET balance = balance + ?
      WHERE id = ?
    `;

    db.query(sql, [amount, accountId], (err) => {
      if (err) {
        req.flash("error", "Deposit failed");
        return res.redirect("/user/deposit");
      }

      saveTransaction(
        null,
        accountId,
        amount,
        "deposit",
        res,
        "Deposit successful (simulation)",
        req,
      );
    });
  });
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
      return res.redirect("/accounts/user/dashboard");
    }

    const transactionId = result.insertId;

    // 👉 CALL FRAUD DETECTION
    // detectFraud(transactionId, from, to, amount, type);
    // 👉 CALL FRAUD DETECTION
    detectFraud(transactionId, from, to, amount, type);

    req.flash("success", message);
    return res.redirect("/accounts/user/dashboard");
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

exports.transactionHistory = (req, res) => {
  const accountId = req.session.user.account_id;

  const sql = `
    SELECT *
    FROM transactions
    WHERE from_account = ? OR to_account = ?
    ORDER BY id DESC
  `;

  db.query(sql, [accountId, accountId], (err, transactions) => {
    if (err) {
      console.log(err);

      req.flash("error", "Could not load transactions");
      return res.redirect("/user/dashboard");
    }

    res.render("user/history", {
      user: req.session.user,
      transactions,
    });
  });
};
