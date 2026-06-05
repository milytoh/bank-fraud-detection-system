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
  }

  // =========================
  // 2. WITHDRAW
  // =========================
  else if (type === "withdraw") {
    const checkSql = `SELECT balance FROM accounts WHERE id = ?`;

    db.query(checkSql, [from_account], (err, result) => {
      if (err || result.length === 0) {
        req.flash("error", "Account not found");
        return res.redirect("/transactions/create");
      }

      const balance = result[0].balance;

      if (balance < amt) {
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
    const checkSql = `SELECT balance FROM accounts WHERE id = ?`;

    db.query(checkSql, [from_account], (err, result) => {
      if (err || result.length === 0) {
        req.flash("error", "Source account not found");
        return res.redirect("/transactions/create");
      }

      const balance = result[0].balance;

      if (balance < amt) {
        req.flash("error", "Insufficient balance");
        return res.redirect("/transactions/create");
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

      db.query(deductSql, [amt, from_account], (err) => {
        if (err) {
          req.flash("error", "Transfer failed");
          return res.redirect("/transactions/create");
        }

        db.query(addSql, [amt, to_account], (err) => {
          if (err) {
            req.flash("error", "Transfer failed");
            return res.redirect("/transactions/create");
            }
            
           

          saveTransaction(
            from_account,
            to_account,
            amt,
            "transfer",
            res,
              "Transfer successful",
            req
          );
        });
      });
    });
  } else {
    req.flash("error", "Invalid transaction type");
    return res.redirect("/transactions/create");
  }
};

function saveTransaction(from, to, amount, type, res, message, req) {
  const sql = `
        INSERT INTO transactions
        (from_account, to_account, amount, type, status)
        VALUES (?, ?, ?, ?, 'success')
    `;

  db.query(sql, [from, to, amount, type], (err) => {
    if (err) {
      console.log(err);
      req.flash("error", "Transaction save failed");
      return res.redirect("/transactions/create");
    }

    req.flash("success", message);
    return res.redirect("/transactions/create");
  });
}