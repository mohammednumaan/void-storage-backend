// imports
const { PrismaClient } = require('@prisma/client');
const CloudinaryInterface = require('../cloudinary/cloudinary');
const asyncHandler = require("express-async-handler");

// initialize prisma client to query and modify the database
const prisma = new PrismaClient();

// a class with STATIC methods to handle file related 
// operations such as create, read, update, move, copy, delete operations

class FileInterface{

    static async #getFiles(req, res, next){

        // extract the file and folder id that was requested
        let {fileId, folderId} = req.params;

        // first, we check if the folder exists in the database
        const folderExists = await prisma.folder.findFirst({where: {
            AND: [
                {id: {equals: folderId}}, 
                {user: {id: req.user.id}}
            ]
        }})

        // if it doesn't we notify the client
        if (!folderExists) return res.status(404).json({message: "Folder Does Not Exist!"});

        // else, we fetch all the files uploaded within that folder
        const allFiles = await prisma.file.findMany({where: {
            AND: [
                {id: {equals: fileId}},
                {folderId: {equals: folderId}},
            ]
        }})

        res.json({message: "Files Retrieved Successfully!", allFiles})
    }
    
    static async #uploadFile(req, res, next){
        // extract the parentFolderId from the request body
        // this is the folderId in which the file is getting uploaded
        const {parentFolderId} = req.body;

        // check if the given folder exists in the database
        const folder = await prisma.folder.findFirst({where: {AND: [
            {userId: req.user.id}, {id: parentFolderId}
        ]}})
        
        // if it doesn't, notify the client 
        if (!folder) return res.status(404).json({message: "Folder Does Not Exist!"});

        // else, we upload the new file to cloudinary as
        // well as store meta-data about it in out psql database
        // but first, we need to check if a file with the same name exists
        const file = await prisma.file.findFirst({where: 
            {
                AND: [
                    {fileName: {equals: req.file.originalname}},
                    {folder: {id: folder.id}},
                ]
            }

        })
        // check if we found a file with the same name. If true, notify 
        // the client about the conflict of filenames
        if (file) return res.status(409).json({error: "File Already Exists!"});
        // we need to upload and store the new file in the 
        // psql database as well as in cloudinary
        // to do that, i need to fetch the parent folder's path 
        const parentFolder = await prisma.folder.findUnique({where: {
            id: parentFolderId,
            userId: req.user.id
        }});

        // now, we need to dynamically generate the folderPath (IMPORTANT)
        // this path determines the location of the asset in cloudinary
        let newFolderPath = `${parentFolder.folderPath}${parentFolder.folderName}/`;
        if (parentFolder.folderName === 'root'){
            newFolderPath = `${parentFolder.folderPath}${parentFolder.folderName}-${req.user.id}/`
        }
        // since we have a file that is stored as a buffer, we need to upload it to
        // cloudinary by converting it to base64 (since cloudinary only uses string or file paths for upload)
        const base64EncodedImage = Buffer.from(req.file.buffer).toString("base64");
        const dataUri = `data:${req.file.mimetype};base64,${base64EncodedImage}`;
        
        // now we upload it to cloudinary, the response received will contain
        // the uploaded file's path, which we can use to display in the front-end
        const uploadedFile = await CloudinaryInterface.uploadFileCloudinary(newFolderPath, dataUri,  next);
        
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
    } 

    static async #deleteFiles(req, res, next){
        
        const {fileId} = req.body;
        
        // checks if the file exists in the database. if not, we notify the client
        const file = await prisma.file.findUnique({where: {id: fileId}})
        if (!file) return res.status(404).json({message: "File Not Found!"});
        
        // else, we need to delete the asset from cloudinary. To do this
        // we can extract the public_id from the image URL, this will be then fed
        // to the delete function to delete the file
        const publicId = file.fileUrl.split('/');
        const imageName = publicId.pop().split('.')[0];
        const finalImageId = publicId.splice(7, 10).join('/') + '/' + imageName;
        
        const cloudinaryResponse = await CloudinaryInterface.deleteFileCloudinary(finalImageId);
        console.log(file)
        if (cloudinaryResponse.result !== 'ok'){
            return res.status(500).json({message: "Failed To Delete File!"});
        }

        await prisma.file.delete({
            where: {
                id: fileId     
            }
        })

        return res.json({message: "File Deleted Successfully!"});
    }

    static async #moveFiles(req, res, next){

        // extractint the selected folder and file from the request
        const {selectedFolderId, moveData} = req.body;

        // check if the given file and folder exists in the database
        const selectedFolder = await prisma.folder.findUnique({
            where: {id: selectedFolderId}
        });

        const selectedFile = await prisma.file.findUnique({
            where: {id: moveData}
        })

        // if they don't exist, we notify the client    
        if (!selectedFolder) return res.status(404).json({message: "Folder Not Found!"});
        if (!selectedFile) return res.status(404).json({message: "File Not Found!"});

        // here, we need to construct a proper url/id for cloudinary to use
        // to rename the file we are going to move
        const fileURL = selectedFile.fileUrl.split('/');
        const filePublicId = fileURL.pop().split('.')[0];
        const filePath = fileURL.slice(7).join('/') + '/' +  filePublicId;
        const cloudinaryResponse = await CloudinaryInterface.moveFileCloudinary(filePath, selectedFolder.folderPath, selectedFolder.folderName, filePublicId, next);
        if (!cloudinaryResponse){
            return res.status(500).json({message: "An Error Occured!"});
        }

        // we can finally update the meta-data in psql database 
        const updatedFile = await prisma.file.update({
            where: {id: moveData},
            data: {
                folder: {connect: {id: selectedFolder.id}},
                fileUrl: cloudinaryResponse.renamedFile.url
            }
        })
        
        return res.json({message: "File Moved Successfully!", movedFile: updatedFile})
    }

    static async #editFile(req, res, next){
        const {folderId, fileId, newFileName} = req.body;
        const file = await prisma.file.findUnique({
            where: {id: fileId}
        })
        const fileExtension = file.fileName.split('.')[file.fileName.split('.').length - 1];

        const fileWithSameNameExists = await prisma.file.findMany({where: {
            AND: [
                {fileName: newFileName + '.' + fileExtension},
                {folderId: folderId}

            ]
        }})

        console.log(fileWithSameNameExists)
        if (fileWithSameNameExists.length !== 0) return res.status(400).json({message: "File with the same name exists in this folder!"});
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

    }


    static getFiles(req, res, next){  
        return asyncHandler(() => FileInterface.#getFiles(req, res, next))()
    }

    static uploadFile(req, res, next){  
        return asyncHandler(() => FileInterface.#uploadFile(req, res, next))()
    }

    static deleteFile(req, res, next){
        return asyncHandler(() => FileInterface.#deleteFiles(req, res, next))();
    }

    static moveFile(req, res, next){
        return asyncHandler(() => FileInterface.#moveFiles(req, res, next))();
    }

    static editFile(req, res, next){
        return asyncHandler(() => FileInterface.#editFile(req, res, next))();
    }


}


// exporting the FolderInterface class
module.exports = FileInterface;