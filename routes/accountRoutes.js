const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const accountController = require("../controllers/accountController");

const userController = require("../controllers/userController");
const { isCustomer } = require("../middleware/auth");

router.get("/", auth, accountController.index);

router.get("/create", auth, accountController.createPage);

router.post("/create", auth, accountController.store);
router.get("/:id", auth, accountController.show);
router.get("/block/:id", auth, accountController.block);

router.get("/unblock/:id", auth, accountController.unblock);

router.get("/user/dashboard", isCustomer, userController.dashboard);
module.exports = router;
