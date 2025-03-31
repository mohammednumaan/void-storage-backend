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

// a simple router level middleware to auto delete expired links
// (this is just a temporary solution, a better one would be to use cron-jobs)
router.use(asyncHandler(async (req, res, next) => {
    const nowDate = new Date();
    const folderLinks = await prisma.folderLinks.findMany({
        where: {
            expiresAt: {lte: nowDate}
        }
    });

    if (folderLinks){
        await prisma.folderLinks.deleteMany({
            where: {
                expiresAt: {lte: nowDate}
            }
        });
        console.log("Removed Expired Folder Links...");
    }

    const fileLinks = await prisma.fileLinks.findMany({
        where: {
            expiresAt: {lte: nowDate}
        }
    });

    if (fileLinks){
        await prisma.fileLinks.deleteMany({
            where: {
                expiresAt: {lte: nowDate}
            }
        });
        console.log("Removed Expired Folder Links...");
    }
    next();
}))

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
router.put('/files', fileInterface.validateFile, fileInterface.editFile);
router.post('/files/generate/', fileInterface.shareFile)
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
router.get('/folders/segments/:parentFolder/:folderId', folderInterface.getFolderPathSegments)

router.post('/folders', folderInterface.validateFolder, folderInterface.createFolder);
router.delete('/folders', folderInterface.deleteFolder);

router.put('/folders', folderInterface.validateFolder, folderInterface.editFolder)
router.put('/folders/move', folderInterface.moveFolder)
router.post('/folders/generate/', folderInterface.shareFolder)
router.post('/folders/view/public/:linkId', folderInterface.getSharedFolder)


// exporting the fileSystem router object
module.exports = router;