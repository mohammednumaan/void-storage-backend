// imports
const express = require('express');
const FolderInterface = require('../controllers/folderController');
const FileInterface = require('../controllers/fileController');
const multer = require("multer");

// configuring multer to use in-memory storage
// this is because, we want to store files temporarily instead
// of saving them in the server's disk
const storage = multer.memoryStorage();
const upload = multer({storage}) 

const router = express.Router();

/* 
FILE ROUTES ARE DEFINED BELOW. THESE INCLUDE:
    - Retrieving File Routes
    - Uploading File Routes
    - Editing File Routes
    - Deleting Files Routes
*/
router.get('/files/:folderId', FileInterface.getFiles);
router.post('/files', upload.single("file"), FileInterface.uploadFile);
router.delete('/files', FileInterface.deleteFile)
router.put('/files/move', FileInterface.moveFile)
router.put('/files', FileInterface.editFile);

// router.get('/files/file/:folderId/:fileId', fileSystemController.file_get);

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
router.get('/folders/available/:folderId', FolderInterface.getAvailableFolders);
router.get('/folders/segments/:folderId', FolderInterface.getFolderSegements)

router.post('/folders', FolderInterface.createFolderPost);
router.delete('/folders', FolderInterface.deleteFolder);

// router.put('/folders', FolderInterface.editFolder)
// router.put('/folders/move', fileSystemController.folder_move)

// exporting the fileSystem router object
module.exports = router;