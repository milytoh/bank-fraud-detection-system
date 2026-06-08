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

  db.query(balanceSql, [accountId], (err, accResult) => {
    if (err || accResult.length === 0) {
      req.flash("error", "Account not found");
      return res.redirect("/auth/customer-login");
    }

    db.query(txnSql, [accountId, accountId], (err, txns) => {
      if (err) {
        txns = [];
      }

      res.render("user/dashboard", {
        user: req.session.user,
        account: accResult[0],
        transactions: txns,
      });
    });
  });
};
