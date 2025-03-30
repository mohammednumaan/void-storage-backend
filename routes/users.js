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
router.post('/logout', userController.logout_post);
router.post('/profile', userController.post_username);
router.post('/profile/delete', userController.delete_account);


// exports
module.exports = router;
    