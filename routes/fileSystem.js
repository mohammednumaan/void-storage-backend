// imports
const express = require('express');
const folderInterface = require('../controllers/folderController');
const multer = require("multer");
const fileInterface = require('../controllers/fileController');

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
router.get('/files/:folderId', fileInterface.getFiles);
router.get('/files/asset/:fileId', fileInterface.getSpecificFile)
router.get('/files/asset/download/:fileId', fileInterface.downloadFile)

router.post('/files', upload.single("file"), fileInterface.uploadFile);

router.delete('/files', fileInterface.deleteFile)
router.put('/files/move', fileInterface.moveFile)
router.put('/files', fileInterface.editFile);
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