// imports
const { CloudinaryStorage } = require('@fluidjs/multer-cloudinary');
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

    static async deleteFolderCloudinary(folderPath, folderName, next){
        try{
            const folderPathToDelete = `${folderPath}${folderName}`;
            console.log(folderPathToDelete)
            // to delete a folder in cloudinary the folder shouldn't contain
            // any resources like images or videos

            // we first find all the resources in cloudinary
            const allResources = await cloudinary.api.resources({
                type: 'upload',
                max_results: 500  // adjust as needed
            });
            
            // we filter the resources based on their folder path and map them
            // to their corresponding public_ids
            const resourcesToDelete = allResources.resources.filter((resource) => {
                return resource.asset_folder.startsWith(folderPathToDelete.substring(1));
            }).map(resource => resource.public_id);

            // we can now delete these resources via their public_id's
            for (const publicId of resourcesToDelete){
                await cloudinary.api.delete_resources(publicId);
            }
            
            // at this point we know for sure that the folder is empty, so we
            // simply delete the folder from cloduinary           
            const deleteFolder = await cloudinary.api.delete_folder(folderPathToDelete);
            return deleteFolder;
        } catch(error){
            return next(error);
        }
    }

    static async uploadFileCloudinary(folderPath, dataUri,  next){
        try{                  
            const uploadedFile = await cloudinary.uploader.upload(dataUri, {asset_folder: folderPath})
            return uploadedFile;
        } catch(error){
            return next(error);
        }
    }

    static async deleteFileCloudinary(imagePublicId, next){
        try{                  
            const deletedFile = await cloudinary.uploader.destroy(imagePublicId);
            return deletedFile;
        } catch(error){
            return next(error);
        }
    }
}

// exporting the cloudinary class
module.exports = CloudinaryInterface;
