const { body, validationResult } = require("express-validator")
const prisma = require("../prisma")

const validateInput = (type, field) => {

    if (type === "folder"){
        return body(field)
        .trim()
        .notEmpty()
        .withMessage("Folder names must not be empty.").bail()
        .isLength({max: 64})
        .withMessage("Folder names cannot be larger than 64 characters.").bail()
        .matches(/^[A-Za-z0-9-_ ]+$/g)
        .withMessage('Folder names must only contain letters, numbers, hyphens, underscores, and spaces.').bail()
        .custom(async (value, {req}) => {
            const duplicateFolder = await prisma.folder.findFirst({
                where: {
                    parentFolder: req.body.parentFolderId,
                    folderName: value,
                    userId: req.user.id
                }
            })
            if (duplicateFolder) throw new Error("A folder with this name already exists in this directory. Please choose a different name.");
            return true;
        })
        .escape()
    }
    else{
        return body(field)
        .trim()
        .notEmpty()
        .withMessage("File names cannot be empty!").bail()
        .isLength({max: 64})
        .withMessage("File names cannot be larger than 64 characters.").bail()
        .matches(/^[A-Za-z0-9-_ ]+$/g)
        .withMessage('File names must only contain letters, numbers, hyphens, underscores, and spaces.').bail()
        .custom(async (value, {req}) => {
            const duplicateFile = await prisma.file.findFirst({
                where: {
                    parentFolder: req.body.folderId,
                    folderName: value,
                    userId: req.user.id
                }
            })
            if (duplicateFile) return false;
            return true;
        })
        .withMessage("A file with the name already exists in this folder. Please choose a different name.")
        .escape()
    }
}

const getValidationErrors = (req, res, next) => {
    const errors = validationResult(req).array();
    if (errors.length > 0){
        return res.status(400).json({errors: errors});
    }
    next();
}

module.exports = {
    validateInput,
    getValidationErrors
}