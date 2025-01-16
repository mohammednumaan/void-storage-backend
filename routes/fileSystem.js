// imports
const express = require('express');
const fileSystemController = require('../controllers/fileSystemController');
const FolderInterface = require('../controllers/folderController');
const router = express.Router();

/* 
FILE ROUTES ARE DEFINED BELOW. THESE INCLUDE:
    - Retrieving File Routes
    - Uploading File Routes
    - Editing File Routes
    - Deleting Files Routes
*/
router.get('/files/:folderId', fileSystemController.file_list_get);
router.get('/files/file/:folderId/:fileId', fileSystemController.file_get);

router.post('/files', fileSystemController.file_upload_post);
router.put('/files', fileSystemController.file_edit);

router.delete('/files', fileSystemController.file_delete)

/* 
FOLDER ROUTES ARE DEFINED BELOW. THESE INCLUDE:
    - Retrieving Folder Routes
    - Uploading Folder Routes
    - Editing Folder Routes
    - Deleting Folders Routes
*/
router.get('/folders', FolderInterface.getFolder); 
router.get('/folders/root', FolderInterface.getRootFolder)
router.get('/folders/:parentFolderId', FolderInterface.getFolder);

router.post('/folders', FolderInterface.createFolderPost);

router.put('/folders', fileSystemController.folder_edit)
router.put('/folders/move', fileSystemController.folder_move)

router.delete('/folders', FolderInterface.deleteFolder);

// exporting the fileSystem router object
module.exports = router;