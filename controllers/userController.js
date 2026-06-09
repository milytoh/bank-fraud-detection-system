const db = require("../config/db");

const PDFDocument = require("pdfkit");

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


const path = require("path");

exports.statement = (req, res) => {
  const accountId = req.session.user.account_id;

  const sql = `
    SELECT *
    FROM transactions
    WHERE from_account = ? OR to_account = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [accountId, accountId], (err, transactions) => {
    if (err) {
      req.flash("error", "Could not generate statement");
      return res.redirect("/user/dashboard");
    }

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=FraudShield-Statement.pdf",
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // =====================
    // LOGO
    // =====================

    const logoPath = path.join(__dirname, "../public/img/f-logo.png");

    try {
      doc.image(logoPath, 50, 40, {
        width: 60,
      });
    } catch (e) {
      console.log("Logo not found");
    }

    // =====================
    // BANK HEADER
    // =====================

    doc.fontSize(24).fillColor("#2563eb").text("FraudShield Bank", 120, 50);

    doc
      .fontSize(10)
      .fillColor("#555")
      .text("Secure Banking Powered by Fraud Detection", 120, 80);

    doc.moveDown(4);

    // =====================
    // CUSTOMER INFO
    // =====================

    doc.fillColor("#000").fontSize(16).text("Account Statement");

    doc.moveDown();

    doc.fontSize(11);

    doc.text(`Customer: ${req.session.user.fullname}`);
    doc.text(`Account ID: ${accountId}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);

    doc.moveDown(2);

    // =====================
    // TABLE HEADER
    // =====================

    const startY = doc.y;

    doc.rect(50, startY, 500, 25).fill("#2563eb");

    doc
      .fillColor("white")
      .fontSize(10)
      .text("Date", 60, startY + 8)
      .text("Type", 200, startY + 8)
      .text("Amount", 320, startY + 8)
      .text("Status", 450, startY + 8);

    ///////

    let y = startY + 35;
    const pageHeight = doc.page.height - 100; // safe margin

    transactions.forEach((t) => {
      // 👉 PAGE BREAK CHECK
      if (y > pageHeight) {
        doc.addPage();
        y = 50;
      }

      doc.fillColor("#000");

      doc.text(new Date(t.created_at).toLocaleDateString(), 60, y);

      doc.text(t.type.toUpperCase(), 200, y);

      doc.text(`₦${Number(t.amount).toLocaleString()}`, 320, y);

      doc.text(t.status, 450, y);

      y += 25;

      doc
        .moveTo(50, y - 5)
        .lineTo(550, y - 5)
        .strokeColor("#e5e7eb")
        .stroke();
    });

    // =====================
    // FOOTER
    // =====================

    doc.moveDown(3);

    doc
      .fontSize(9)
      .fillColor("#777")
      .text(
        "This statement was generated electronically by FraudShield Bank.",
        {
          align: "center",
        },
      );

    doc.text("Secure Banking Powered by Fraud Detection", {
      align: "center",
    });

    doc.end();
  });
};