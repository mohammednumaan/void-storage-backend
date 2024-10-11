var express = require('express');
const userController = require('../controllers/userController');
var router = express.Router();

// user routes which includes register, login and authentication routes
router.get('/authenticate', userController.authenticate_get);
router.post('/register', userController.register_post);
router.post('/login', userController.login_post);

module.exports = router;
