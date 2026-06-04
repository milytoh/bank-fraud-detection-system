const db = require("../config/db");

// List customers
exports.index = (req, res) => {
  db.query("SELECT * FROM customers ORDER BY id DESC", (err, customers) => {
    if (err) {
      console.log(err);
      return res.send("Error loading customers");
    }

    res.render("customers/index", {
      user: req.session.user,
      customers,
    });
  });
};

// Show create page
exports.createPage = (req, res) => {
  res.render("customers/create", {
    user: req.session.user,
  });
};

// Store customer
exports.store = (req, res) => {
  const { fullname, email, phone, address } = req.body;

  const customerCode = "CUS-" + Date.now().toString().slice(-6);

  const sql = `
        INSERT INTO customers
        (
            customer_code,
            fullname,
            email,
            phone,
            address
        )
        VALUES (?, ?, ?, ?, ?)
    `;

  db.query(sql, [customerCode, fullname, email, phone, address], (err) => {
    if (err) {
      console.log(err);
      return res.send(err.message);
    }

    res.redirect("/customers");
  });
};
