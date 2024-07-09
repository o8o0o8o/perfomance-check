const { join } = require("path");
const fs = require("fs");

// Recursive function to get files
function getJSONFiles(dir, files = []) {
  // Get an array of all files and directories in the passed directory using fs.readdirSync
  const fileList = fs.readdirSync(dir);
  // Create the full path of the file/directory by concatenating the passed directory and file/directory name
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    // Check if the current file/directory is a directory using fs.statSync
    if (fs.statSync(name).isDirectory()) {
      // If it is a directory, recursively call the getFiles function with the directory path and the files array
      getJSONFiles(name, files);
    } else {
      // If it is a lighthouse.json file, push the full path to the files array
      if (name.endsWith("lighthouse.json")) {
        files.push(name);
      }
    }
  }

  return files;
}
async function main() {
  const site = process.argv[2]
    .replace(/\s/g, "")
    .replace(/\/$/, "")
    .replace("https://", "");

  const folder = join(process.cwd(), ".unlighthouse", site);
  const files = getJSONFiles(folder);

  const sorted = [];

  for (const file of files) {
    const data = await JSON.parse(fs.readFileSync(file, "utf-8"));

    sorted.push({
      file,
      value: data.audits.metrics.numericValue,
      url: data.requestedUrl,
    });
  }

  sorted.sort((a, b) => {
    if (a.value > b.value) {
      return 1;
    }
    return -1;
  });

  const best = sorted.slice(sorted.length - 4, sorted.length - 1);
  const worst = sorted.slice(0, 3);

  fs.writeFileSync(
    join(process.cwd(), "perf", "pickedBest"),
    best.map((data) => data.url).join(", ")
  );
  fs.writeFileSync(
    join(process.cwd(), "perf", "pickedWorst"),
    worst.map((data) => data.url).join(", ")
  );
}

main();
