// imports
const express = require('express');
const fileSystemController = require('../controllers/fileSystemController');
const router = express.Router();

// file routes to handle get and upload files
// defines get requests for accessing specific files
router.get('/files/:folderId', fileSystemController.file_list_get);
router.get('/files/file/:folderId/:fileId', fileSystemController.file_get);
router.delete('/files', fileSystemController.file_delete)

// defined a post request for uploading files
router.post('/files', fileSystemController.file_upload_post);

// folder routes to handle getting, deleteting and creating folders
router.get('/folders', fileSystemController.folder_list_get);
router.get('/folders/:folderId', fileSystemController.folder_list_get);
router.post('/folders', fileSystemController.folder_create_post);
router.delete('/folders', fileSystemController.folder_delete)

// exports
module.exports = router;