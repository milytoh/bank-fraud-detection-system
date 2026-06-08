module.exports = function (req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

// OPTIONAL EXTENSION (add below)
module.exports.isCustomer = function (req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/customer-login");
  }

  if (req.session.user.role !== "customer") {
    return res.status(403).send("Access denied");
  }

  next();
};

module.exports.isAdmin = function (req, res, next) {
  if (!req.session.admin) {
    return res.redirect("/auth/login");
  }

  next();
};
