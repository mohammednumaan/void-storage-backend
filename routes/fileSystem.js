// imports
const express = require('express');
const folderInterface = require('../controllers/folderController');
const multer = require("multer");
const fileInterface = require('../controllers/fileController');
const prisma = require("../prisma");
const asyncHandler = require('express-async-handler');

// configuring multer to use in-memory storage
// this is because, we want to store files temporarily instead
// of saving them in the server's disk
const storage = multer.memoryStorage();
const upload = multer({storage}) 
const router = express.Router();

// middleware to auto delete expired links — only runs on mutating routes
const cleanupExpiredLinks = asyncHandler(async (req, res, next) => {
    const nowDate = new Date();
    await prisma.folderLinks.deleteMany({
        where: { expiresAt: { lte: nowDate } }
    });
    await prisma.fileLinks.deleteMany({
        where: { expiresAt: { lte: nowDate } }
    });
    next();
})

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

router.post('/files', cleanupExpiredLinks, upload.single("file"), fileInterface.uploadFile);

router.delete('/files', cleanupExpiredLinks, fileInterface.deleteFile)
router.put('/files/move', cleanupExpiredLinks, fileInterface.moveFile)
router.put('/files', cleanupExpiredLinks, fileInterface.validateFile, fileInterface.editFile);
router.post('/files/generate/', cleanupExpiredLinks, fileInterface.shareFile)
router.post('/files/view/public/:linkId', fileInterface.getSharedFile)


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

router.post('/folders', cleanupExpiredLinks, folderInterface.validateFolder, folderInterface.createFolder);
router.delete('/folders', cleanupExpiredLinks, folderInterface.deleteFolder);

router.put('/folders', cleanupExpiredLinks, folderInterface.validateFolder, folderInterface.editFolder)
router.put('/folders/move', cleanupExpiredLinks, folderInterface.moveFolder)
router.post('/folders/generate/', cleanupExpiredLinks, folderInterface.shareFolder)
router.post('/folders/view/public/:linkId', folderInterface.getSharedFolder)


// exporting the fileSystem router object
module.exports = router;