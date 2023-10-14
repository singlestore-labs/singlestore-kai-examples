const fs = require("fs");
const path = require("path");

const directoryPath = process.cwd();

fs.readdir(directoryPath, (err, files) => {
  if (err) return console.error("Unable to scan directory:", err);

  files.forEach((file) => {
    const oldPath = path.join(directoryPath, file);
    const newName = decodeURI(file).replace(/[^a-zA-Z0-9.\s_-]/g, "_");
    const newPath = path.join(directoryPath, newName);
    fs.rename(oldPath, newPath, (err) => {
      if (err) console.error("Error renaming file:", err);
    });
  });
});
