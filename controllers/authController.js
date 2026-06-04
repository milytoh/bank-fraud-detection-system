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
        return res.send("User not found");
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.send("Invalid password");
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
