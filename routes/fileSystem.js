// imports
const express = require('express');
const fileSystemController = require('../controllers/fileSystemController');
const FolderInterface = require('../controllers/folderController');
const router = express.Router();

// file routes to handle get and upload files
// defines get requests for accessing specific files
router.get('/files/:folderId', fileSystemController.file_list_get);
router.get('/files/file/:folderId/:fileId', fileSystemController.file_get);
router.put('/files', fileSystemController.file_edit);
router.delete('/files', fileSystemController.file_delete)

// defined a post request for uploading files
router.post('/files', fileSystemController.file_upload_post);

// folder routes to handle getting, deleteting and creating folders
router.get('/folders', fileSystemController.folder_list_get);
router.get('/folders/:folderId', fileSystemController.folder_list_get);
router.post('/folders', FolderInterface.createFolderPost);
router.put('/folders', fileSystemController.folder_edit)
router.put('/folders/move', fileSystemController.folder_move)

router.delete('/folders', fileSystemController.folder_delete)

// exports
module.exports = router;