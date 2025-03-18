/*
  Warnings:

  - A unique constraint covering the columns `[fileUrl]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "File_fileUrl_key" ON "File"("fileUrl");
