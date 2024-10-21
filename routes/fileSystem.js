// imports
const express = require('express');
const fileSystemController = require('../controllers/fileSystemController');
const router = express.Router();

// file-system route to handle file uploads
router.post('/files', fileSystemController.file_upload_post);

module.exports = router;