exports.dashboard = (req, res) => {
  const user = req.session.user;

res.render("admin/dashboard", {
  user: req.session.user,
  customerIsAuthenticated:
    req.session.user && req.session.user.role === "customer" ? true : false,
  adminIsAuthenticated:
    req.session.user && req.session.user.role === "admin" ? true : false,
  stats: {
    customers: 0,
    accounts: 0,
    alerts: 0,
  },
});
};
