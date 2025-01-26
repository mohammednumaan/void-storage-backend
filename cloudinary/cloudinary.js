// imports
const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
dotenv.config();

// configuring cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// a STATIC cloudinary class to manage cloudinary related operations
// such as create, delete, update and read operations
class CloudinaryInterface{

    static async createFolderCloudinary(folderPath, newFolderName, next){
        try{
            const newFolderPath = `${folderPath}/${newFolderName}`;
            const folder = await cloudinary.api.create_folder(newFolderPath);
            return folder;
        } catch(error){
            next(error);
        }
    }

    static async deleteFolderCloudinary(folderPath, folderPrefixPath, next){
        try{
            // to delete a folder in cloudinary the folder shouldn't contain
            // any resources like images or videos, so we delete all those assets first
            const deletedAssets = await cloudinary.api.delete_resources_by_prefix(folderPrefixPath);
            // at this point we know for sure that the folder is empty, so we
            // simply delete the folder from cloduinary           
            const deleteFolder = await cloudinary.api.delete_folder(folderPath);
            return deleteFolder;
        } catch(error){
            console.log(error)
        }
    }

    static async renameFolderCloudinary(oldFolderPath, newFolderPath, next){
        try{
            const renamedFolder = await cloudinary.api.rename_folder(oldFolderPath, newFolderPath);
            return renamedFolder;
        } catch(error){
            console.log(error)
        }
    }

    static async uploadFileCloudinary(folderPath, dataUri,folderId,  next){
        try{        
            const uploadedFile = await cloudinary.uploader.upload(dataUri, {asset_folder: folderPath, use_asset_folder_as_public_id_prefix: true})
            return uploadedFile;
        } catch(error){
            console.log(error)
        }
    }

    static async deleteFileCloudinary(imagePublicId, next){
        try{                  
            const deletedFile = await cloudinary.uploader.destroy(imagePublicId);
            return deletedFile;
        } catch(error){
            console.log(error)
        }
    }

    static async moveFileCloudinary(imagePublicId, newAssetFolder, imageName, next){
        try{

            // to move a file from one folder to another, we need to provide 
            // a new publicId and a new folder path to change the folder as well as the name
            const newFolderPath = `${newAssetFolder}/${imageName}`
            console.log("PUB", "FOLDER", newAssetFolder, "IMG", imagePublicId)
            // we can now rename as well as update the folder path of the asset in cloudinary
            const movedFile = await cloudinary.api.update(imagePublicId, {asset_folder: newAssetFolder  .substring(1)})
            console.log(movedFile)
            const renamedFile = await cloudinary.uploader.rename(imagePublicId, newFolderPath.substring(1));
            
            // return the updated details
            return {movedFile, renamedFile};
        } catch (error){
            console.log(error)
        }
    }
}

// exporting the cloudinary class
module.exports = CloudinaryInterface;
