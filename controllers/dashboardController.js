exports.dashboard = (req, res) => {
  const user = req.session.user;

res.render("admin/dashboard", {
  user: req.session.user,
  stats: {
    customers: 0,
    accounts: 0,
    alerts: 0,
  },
});
};
