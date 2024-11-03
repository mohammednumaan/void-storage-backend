// imports
const express = require('express');
const fileSystemController = require('../controllers/fileSystemController');
const router = express.Router();


// file-system route to handle folder operations and file uploads
router.get('/folders', fileSystemController.folder_list_get);
router.post('/files', fileSystemController.file_upload_post);
router.post('/folders', fileSystemController.folder_create_post);

module.exports = router;