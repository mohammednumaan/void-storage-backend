const prisma = require("../prisma")

const constructFilePath = async (file) => {
    let folderPath = null;
    if (file.folderId !== null){
        const parentFolder = await prisma.folder.findUnique({
            where: {id: file.parentFolder}
        })

        const folderPath = await createFolderPath(parentFolder);
        folderPath.push({name: file.fileName, id: file.id});
    }
    
    return folderPath || folderPath;
}

const constructFolderPath = async (folder) => {
    let folderPath = [{name: folder.folderName, id: folder.id}];
    let curretFolder = folder;
    while (curretFolder.parentFolder){
        const parentFolder = await prisma.folder.findUnique({
            where: {id: folder.parentFolder}
        })
        folderPath.unshift({name: parentFolder.folderName, id: parentFolder.id})
        curretFolder = parentFolder;
    }
    return folderPath;
}

module.exports = {
    constructFilePath,
    constructFolderPath
}