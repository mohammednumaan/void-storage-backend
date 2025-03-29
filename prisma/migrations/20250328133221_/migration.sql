-- CreateTable
CREATE TABLE "FolderLinks" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolderLinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileLinks" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileLinks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FolderLinks" ADD CONSTRAINT "FolderLinks_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileLinks" ADD CONSTRAINT "FileLinks_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
