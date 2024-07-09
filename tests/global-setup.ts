import fs from "fs";
import { join } from "path";

async function globalSetup() {
  // const startTime = Date.now();
  // console.log("GLOBAL SETUP");

  try {
    // const BASIC_FOLDER = "perf";
    // const fullPathToCurrentHost = join(
    //   process.cwd(),
    //   BASIC_FOLDER,
    //   "currentWebsite"
    // );
    // const currentWebSite = fs
    //   .readFileSync(fullPathToCurrentHost, "utf-8")
    //   .replace(/\s/g, "")
    //   .replace(/\/$/, "");
    // const folderName = currentWebSite.replace("https://", "");
    // const currentFolder = join(process.cwd(), BASIC_FOLDER, folderName);
    // const fullPath = join(process.cwd(), BASIC_FOLDER, "lastTest.json");
    // fs.writeFileSync(
    //   fullPath,
    //   JSON.stringify({
    //     startTime,
    //     dateString: startTime,
    //     HOST: currentWebSite,
    //     folder: folderName,
    //   })
    // );
    // fs.mkdirSync(currentFolder);
  } catch (error) {}
}

export default globalSetup;
