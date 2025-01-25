// imports
const express = require('express');
const folderInterface = require('../controllers/folderController');
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
router.get('/folders/root', folderInterface.getRootFolder)
router.get('/folders/:parentFolderId', folderInterface.getFolders);
router.get('/folders/segments/:folderId', folderInterface.getFolderPathSegments)

router.post('/folders', folderInterface.validateFolder, folderInterface.createFolder);
router.delete('/folders', folderInterface.deleteFolder);

router.put('/folders', folderInterface.validateFolder, folderInterface.editFolder)
router.put('/folders/move', folderInterface.moveFolder)

// exporting the fileSystem router object
module.exports = router;