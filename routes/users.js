// imports
const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

/* 
USER ROUTES ARE DEFINED BELOW. THESE INCLUDE:
    - AUTHENTICATING A USER
    - REGISTERING A USER
    - LOGGIN IN A USER
*/
router.get('/authenticate', userController.authenticate_get);
router.post('/register', userController.register_post);
router.post('/login', userController.login_post);

// exports
module.exports = router;
    