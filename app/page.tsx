import { join } from "path";
import Chart from "./Chart";
import fs from "fs";

export default async function Home() {
  const results = [];
  let audits = {};

  try {
    const BASIC_FOLDER = "perf";
    const currentFolder = join(process.cwd(), BASIC_FOLDER);
    const files = fs.readdirSync(currentFolder);

    audits = await JSON.parse(
      fs.readFileSync(join(currentFolder, "audits.json"), "utf-8")
    );

    for (const file of files) {
      if (file.includes("results") && file.endsWith("json")) {
        const rawFile = fs.readFileSync(join(currentFolder, file), "utf-8");

        const formatted = await JSON.parse(rawFile);

        results.push({
          ...formatted,
          page: file.split("results")[1].replace(".json", ""),
        });
      }
    }
  } catch (error) {}

  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-24">
      <Chart results={results} audits={audits} />
    </main>
  );
}
