exports.dashboard = (req, res) => {
  const user = req.session.user;

  res.render("admin/dashboard", { user });
};
