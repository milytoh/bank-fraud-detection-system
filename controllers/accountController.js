const db = require("../config/db");

// Show all accounts
exports.index = (req, res) => {
  const sql = `
        SELECT
            accounts.*,
            customers.fullname
        FROM accounts
        JOIN customers
        ON accounts.customer_id = customers.id
        ORDER BY accounts.id DESC
    `;

  db.query(sql, (err, accounts) => {
    if (err) {
      console.log(err);
      return res.send("Error loading accounts");
    }

    res.render("accounts/index", {
      user: req.session.user,
      accounts,
    });
  });
};

// Show create page
exports.createPage = (req, res) => {
  db.query(
    "SELECT * FROM customers ORDER BY fullname ASC",
    (err, customers) => {
      if (err) {
        console.log(err);
        return res.send("Error loading customers");
      }

      res.render("accounts/create", {
        user: req.session.user,
        customers,
      });
    },
  );
};

// Create account
exports.store = (req, res) => {
  const { customer_id, account_type, balance } = req.body;

  const accountNumber = Math.floor(
    1000000000 + Math.random() * 9000000000,
  ).toString();

  const sql = `
        INSERT INTO accounts
        (
            customer_id,
            account_number,
            account_type,
            balance
        )
        VALUES (?, ?, ?, ?)
    `;

  db.query(
    sql,
    [customer_id, accountNumber, account_type, balance || 0],
    (err) => {
      if (err) {
        console.log(err);
        return res.send(err.message);
      }

      res.redirect("/accounts");
    },
  );
};
