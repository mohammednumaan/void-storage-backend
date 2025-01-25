const prisma = require("../prisma")

const constructFilePath = async (file) => {
    let folderPath = null;
    if (file.folderId !== null){
        const parentFolder = await prisma.folder.findUnique({
            where: {id: file.folderId}
        })

        const folderPath = await createFolderPath(parentFolder);
        folderPath.push({name: file.fileName, id: file.id});
    }
    
    return folderPath;
}

const constructFolderPath = async (folder) => {
    let folderPath = [{name: folder.folderName, id: folder.id}];
    let currentFolder = folder;
    while (currentFolder.parentFolder){
        const parentFolder = await prisma.folder.findUnique({
            where: {id: currentFolder.parentFolder}
        })
        folderPath.unshift({name: parentFolder.folderName, id: parentFolder.id})
        currentFolder = parentFolder;
    }
    return folderPath;
}

const constructPathString = async (folder, userId) => {
    let folderPath = '';
    let folderPathArr = await constructFolderPath(folder);

    if (!folderPathArr.length) folderPath += `/root-${userId}/`;
    for (const segment of folderPathArr){
        folderPath += (segment.name === 'root') ? `/root-${userId}/` : segment.name + '/';
    }

    return folderPath;
}

module.exports = {
    constructFilePath,
    constructFolderPath,
    constructPathString
}