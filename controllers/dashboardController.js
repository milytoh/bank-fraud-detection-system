const db = require("../config/db");

exports.dashboard = (req, res) => {
  const user = req.session.user;

  const customersSql = `SELECT COUNT(*) AS total FROM customers`;
  const accountsSql = `SELECT COUNT(*) AS total FROM accounts`;
  const alertsSql = `SELECT COUNT(*) AS total FROM alerts`;

  db.query(customersSql, (err, c) => {
    if (err) return res.redirect("/auth/login");

    db.query(accountsSql, (err, a) => {
      if (err) return res.redirect("/auth/login");

      db.query(alertsSql, (err, al) => {
        if (err) return res.redirect("/auth/login");

        res.render("admin/dashboard", {
          user: req.session.user,
          customerIsAuthenticated:
            req.session.user && req.session.user.role === "customer"
              ? true
              : false,
          adminIsAuthenticated:
            req.session.user && req.session.user.role === "admin"
              ? true
              : false,
          stats: {
            customers: c[0].total,
            accounts: a[0].total,
            alerts: al[0].total,
          },
        });
      });
    });
  });
};



 