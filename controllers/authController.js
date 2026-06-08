const db = require("../config/db");
const bcrypt = require("bcrypt");

// SHOW LOGIN PAGE
exports.getLogin = (req, res) => {
  res.render("auth/login");
};

// REGISTER USER (TEMP FOR TESTING)
exports.register = async (req, res) => {
  const { fullname, email, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql =
    "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [fullname, email, hashedPassword, role], (err) => {
    if (err) return res.send(err);
    res.send("User created");
  });
};

// LOGIN USER
exports.login = (req, res, next) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.send(err);

      if (results.length === 0) {
        req.flash("error", "invalid email or password");
        return res.redirect("/auth/login");
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        
         req.flash("error", "invalid email or password");
         return res.redirect("/auth/login");
      }

      req.session.user = user;

      res.redirect("/dashboard");

      //   res.send("Login successful");
    },
  );

 
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};

// SHOW LOGIN PAGE
exports.showCustomerLogin = (req, res) => {
  res.render("auth/customer-login");
};

exports.customerLogin = (req, res) => {
  const { email, account_number } = req.body;

  const sql = `
    SELECT 
      customers.id AS customer_id,
      customers.fullname,
      customers.email,
      accounts.id AS account_id,
      accounts.account_number,
      accounts.status
    FROM accounts
    JOIN customers ON customers.id = accounts.customer_id
    WHERE customers.email = ?
    AND accounts.account_number = ?
  `;

  db.query(sql, [email, account_number], (err, result) => {
    if (err) {
      req.flash("error", "Login failed");
      return res.redirect("/auth/customer-login");
    }

    if (result.length === 0) {
      req.flash("error", "Invalid credentials");
      return res.redirect("/auth/customer-login");
    }

    const user = result[0];

    // Blocked account check
    if (user.status === "blocked") {
      req.flash("error", "Account is blocked");
      return res.redirect("/auth/customer-login");
    }

    // SESSION
    req.session.user = {
      role: "customer",
      customer_id: user.customer_id,
      account_id: user.account_id,
      fullname: user.fullname,
    };

    req.flash("success", "Login successful");
    return res.redirect("/accounts/user/dashboard");
  });
};