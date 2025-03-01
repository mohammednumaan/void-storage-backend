// imports
const CloudinaryInterface = require('../cloudinary/cloudinary');
const asyncHandler = require("express-async-handler");
const { constructPathString } = require('../utils/constructPath');
const { validateInput, getValidationErrors } = require('../utils/validateInput');
const { Readble } = require("stream")
const prisma = require('../prisma');

const fileInterface = {

    // this method, fetches all files within a folder
    getFiles: asyncHandler(async (req, res, next) => {
        let {fileId, folderId} = req.params;

        // first, we check if the folder exists in the database
        const folderExists = await prisma.folder.findFirst({where: {
            AND: [
                {id: {equals: folderId}}, 
                {user: {id: req.user.id}}
            ]
        }})

        // if it doesn't we notify the client
        if (!folderExists) return res.status(404).json({message: "The folder for which the files were requested cannot be found."});

        // else, we fetch all the files uploaded within that folder
        const allFiles = await prisma.file.findMany({where: {
            AND: [
                {id: {equals: fileId}},
                {folderId: {equals: folderId}},
            ]
        }})

        res.json({message: "Files Retrieved Successfully!", allFiles})
    }),

    // this method,fetches a single file
    getSpecificFile: asyncHandler(async (req, res, next) => {
        let {fileId} = req.params;

        const file = await prisma.file.findUnique({where: {id: fileId}});
        if (!file) return res.status(404).json({message: "The requested file cannot be found."});
        return res.json({message: "File retrieved successfully!", file})
    }),


    // this method, validates the input fields while editing/renaming a file
    validateFile: [
        validateInput("file", "newFileName"),
        getValidationErrors,
    ],

    // this method, uploads the given file to cloudinary and store 
    // its meta-data in the psql database
    uploadFile: asyncHandler(async (req, res, next) => {

        // extract the parentFolderId from the request body
        // this is the folderId in which the file is getting uploaded
        const {parentFolderId} = req.body;

        // check if the given folder exists in the database
        const folder = await prisma.folder.findFirst({where: {AND: [
            {userId: req.user.id}, {id: parentFolderId}
        ]}})
        
        // if it doesn't, notify the client 
        if (!folder) return res.status(404).json({message: "The selected folder for uploading this file could not be found."});

        // else, we upload the new file to cloudinary as
        // well as store meta-data about it in out psql database
        // but first, we need to check if a file with the same name exists
        const file = await prisma.file.findFirst({where: 
            {AND: [
                    {fileName: {equals: req.file.originalname}},
                    {folder: {id: folder.id}},
            ]}
        })

        if (file) return res.status(409).json({error: "The folder already contains a file with the same name. Please rename the file."});

        // we need to upload and store the new file in the 
        // psql database as well as in cloudinary
        // to do that, i need to fetch the parent folder's path 
        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        // now, we need to construct the file path dynamically
        let newFolderPath = await constructPathString(parentFolder, req.user.id);

        // since we have a file that is stored as a buffer, we need to upload it to
        // cloudinary by converting it to base64 (since cloudinary only uses string or file paths for upload)
        const base64EncodedImage = Buffer.from(req.file.buffer).toString("base64");
        const dataUri = `data:${req.file.mimetype};base64,${base64EncodedImage}`;
        
        // now we upload it to cloudinary, the response received will contain
        // the uploaded file's path, which we can use to display in the front-end
        const uploadedFile = await CloudinaryInterface.uploadFileCloudinary(newFolderPath, dataUri, parentFolderId, next);
        
        if (!uploadedFile){
            return res.status(500).json({message: "File Upload Failed!"})
        }
        // now, we can safely create/upload the file in the database as well
        // as in cloudinary via the req.file object
        const newFile = await prisma.file.create({
            data: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                createdAt: new Date(),
                folder: {connect: {id: folder.id}},
                fileUrl: uploadedFile.url
            }
        })

        // finally, we notify the client about the successfull upload
        return res.json({message: "File Uploaded Successfully!", uploadedFile: newFile});
    }),

    // this method, edits/renames a file
    editFile: asyncHandler(async (req, res, next) => {

        const {folderId, fileId, newFileName} = req.body;

        // retrieve the requested file to edit from the database
        const file = await prisma.file.findUnique({
            where: {id: fileId}
        })

        // extract the extension of the file from the filename
        const fileExtension = file.fileName.split('.')[file.fileName.split('.').length - 1];

        const fileWithSameNameExists = await prisma.file.findMany({where: {
            AND: [
                {fileName: newFileName + '.' + fileExtension},
                {folderId: folderId}

            ]
        }})

        // the reason we directly update the meta-data in the database and not
        // rename the file in cloudinary is because, cloudinary generates a unique identifier
        // for each asset, so this seemed unneccesary
        const renamedFile = await prisma.file.update({
            where: {
                id: fileId,
                folderId: folderId
            }, 
            data: {
                fileName: newFileName + "." + fileExtension
            }
        })

        return res.json({message: "File Renamed Successfully!", renamedFile})
    }),

    // this method, deletes a file
    deleteFile: asyncHandler(async (req, res, next) => {
        
        const {fileId} = req.body;
        
        // checks if the file exists in the database. if not, we notify the client
        const file = await prisma.file.findUnique({where: {id: fileId}})
        if (!file) return res.status(404).json({message: "The requested file to delete cannot be found."});
        
        // else, we need to delete the asset from cloudinary. To do this
        // we can extract the public_id from the image URL, this will be then fed
        // to the delete function to delete the file
        const publicId = file.fileUrl.split('/');
        const imageName = publicId.pop().split('.')[0];
        const finalImageId = (publicId.slice(7).join('/') + '/' + imageName).replaceAll("%20", " ");
                
        // deleting the asset from cloudinary and from the psql database
        const cloudinaryResponse = await CloudinaryInterface.deleteFileCloudinary(finalImageId);
        if (cloudinaryResponse.result !== 'ok'){
            console.log(cloudinaryResponse)
            return res.status(500).json({message: "An error occured while deleting this file."});
        }

        await prisma.file.delete({
            where: {
                id: fileId     
            }
        })
        return res.json({message: "File Deleted Successfully!"});
    }),

    // this method, moves a file from one folder to another
    moveFile: asyncHandler(async (req, res, next) => {
        
        const {selectedFolderId, moveData} = req.body;

        // check if the given file to move and the selectedfolder exists in the database
        const selectedFolder = await prisma.folder.findUnique({where: {id: selectedFolderId}});
        const fileToMove = await prisma.file.findUnique({where: {id: moveData}})

        // checks if a file with the same name exists in the selected folder
        const sameFileNameExists = await prisma.file.findFirst({
            where: {
                AND: [{folderId: selectedFolder.id}, {fileName: fileToMove.fileName}]
            }
        })

        if (sameFileNameExists) return res.status(403).json({message: "A file with the same name already exists in the selected folder."})

        // now, we need to construct the file path dynamically
        let newFolderPath = await constructPathString(selectedFolder, req.user.id);

        // here, we need to construct a proper url/id for cloudinary to use
        // to rename the file we are going to move
        // here, while dealing with paths, cloudinary does not need the file-extension
        // so, here, i extract the display name (unique) from the url and remove the file extension
        const fileURL = fileToMove.fileUrl.split('/');
        const filePublicId = fileURL.pop().split('.')[0];
        const filePath = fileURL.slice(7).join('/') + '/' +  filePublicId;

        const cloudinaryResponse = await CloudinaryInterface.moveFileCloudinary(filePath, newFolderPath, filePublicId, next);
        if (!cloudinaryResponse){
            return res.status(500).json({message: "An error occured while moving this file."});
        }

        // we can safely update the meta-data in psql database 
        const updatedFile = await prisma.file.update({
            where: {id: moveData},
            data: {
                folder: {connect: {id: selectedFolder.id}},
                fileUrl: cloudinaryResponse.renamedFile.url
            }
        })
        
        return res.json({message: "File Moved Successfully!", movedFile: updatedFile})
    }),

    downloadFile: asyncHandler(async (req, res, next) => {
        const { fileId } = req.params;
        const file = await prisma.file.findUnique({
            where: {id: fileId}
        })

        if (!file) return res.status(404).json({message: "File could not be found."});

        const imageResponse = await fetch(file.fileUrl);
        if (!imageResponse.ok){
            return res.status(500).json({message: "Something went wrong. Could not fetch image."})
        }

        
        res.setHeader('Content-Type', imageResponse.headers.get('content-type'));
        res.setHeader('Content-Disposition', `attachment;`);

        const buffer = await imageResponse.arrayBuffer();
        res.send(Buffer.from(buffer));
    })
}

// exports
module.exports = fileInterface;