import { Response, Request } from "express";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

export function createBackup(res: Response) {
  try {
    const zip = new AdmZip();
    const root = process.cwd();

    function addDirToZip(dirPath: string, zipPath: string) {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        if (["node_modules", "dist", ".git", ".env"].includes(item)) continue;
        if (item.endsWith(".sqlite-journal") || item.endsWith(".sqlite-wal") || item.endsWith(".sqlite-shm")) continue;

        const fullPath = path.join(dirPath, item);
        const relativeZipPath = zipPath ? `${zipPath}/${item}` : item;
        
        if (fs.statSync(fullPath).isDirectory()) {
          zip.addLocalFolder(fullPath, relativeZipPath);
        } else {
          zip.addLocalFile(fullPath, zipPath);
        }
      }
    }

    addDirToZip(root, "");

    const zipBuffer = zip.toBuffer();

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="phoenix_v2_backup.zip"',
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
  } catch (err: any) {
    console.error("[Backup] Error creating ZIP:", err);
    res.status(500).send("Error creating backup ZIP");
  }
}

