const { join } = require("path");
const fs = require("fs");

const DETAILED_PERFORMANCE_POSTFIX = "detailed";
const lastTestFileName = "lastTest.json";
const BASIC_FOLDER = "perf";
const results = {};

async function main() {
  const lastTestPath = join(process.cwd(), BASIC_FOLDER, lastTestFileName);
  const lastTestFile = fs.readFileSync(lastTestPath, "utf-8");
  const parsedLastTest = await JSON.parse(lastTestFile);

  const currentFolder = join(
    process.cwd(),
    BASIC_FOLDER,
    parsedLastTest.folder
  );

  const files = fs.readdirSync(currentFolder);
  const sortedFiles = [];

  for (const file of files) {
    if (file.includes(DETAILED_PERFORMANCE_POSTFIX)) {
      const rawFile = fs.readFileSync(join(currentFolder, file), "utf-8");

      const formatted = await JSON.parse(rawFile);

      sortedFiles.push({ ...formatted, fileName: file });
    }
  }

  sortedFiles.sort((a, b) => {
    if (a.weight > b.weight) {
      return -1;
    }

    return 1;
  });

  for (const file of sortedFiles) {
    const trimmedFiledName = file.fileName.split("__")[0].trim();
    const conditions = trimmedFiledName.split(" ");

    if (!results[conditions[0]]) {
      results[conditions[0]] = {};
    }

    if (!results[conditions[0]][conditions[1]]) {
      results[conditions[0]][conditions[1]] = {};
    }

    if (!results[conditions[0]][conditions[1]][conditions[2]]) {
      results[conditions[0]][conditions[1]][conditions[2]] = {};
    }

    if (!results[conditions[0]][conditions[1]][conditions[2]].FCP) {
      results[conditions[0]][conditions[1]][conditions[2]].FCP = [];
    }

    if (!results[conditions[0]][conditions[1]][conditions[2]].LCP) {
      results[conditions[0]][conditions[1]][conditions[2]].LCP = [];
    }

    if (!results[conditions[0]][conditions[1]][conditions[2]].L) {
      results[conditions[0]][conditions[1]][conditions[2]].L = [];
    }

    results[conditions[0]][conditions[1]][conditions[2]].FCP.push(+file.FCP);
    results[conditions[0]][conditions[1]][conditions[2]].LCP.push(+file.LCP);
    results[conditions[0]][conditions[1]][conditions[2]].L.push(+file.L);
  }

  try {
    fs.writeFileSync(
      join(process.cwd(), BASIC_FOLDER, `results${parsedLastTest.folder}.json`),
      JSON.stringify(results)
    );
  } catch (error) {}

  try {
    const endTime = Date.now();

    fs.writeFileSync(
      lastTestPath,
      JSON.stringify({ ...parsedLastTest, endTime })
    );
  } catch (error) {}
}

main();
