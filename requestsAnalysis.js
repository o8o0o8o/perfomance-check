const { chromium } = require("playwright");
const fs = require("fs");
const { join } = require("path");
const DOCUMENT_RESPONSE_TIME_THRESHOLD = 200;

async function requestsAnalysis() {
  const requestAnalysis = {
    document: {
      TTFB: 0,
      TTI: 0,
      FCP: 0,
      DCL: 0,
      L: 0,
      server: "",
      xHeaders: [],
    },
    requests: { total: 0 },
    biggestAsset: { size: 0, url: "", contentType: "" },
    slowestAsset: { size: 0, url: "", contentType: "", duration: 0 },
    not200: { total: 0, requests: [] },
    cache: { total: 0 },
  };
  const sites = process.argv.slice(2);

  const results = await Promise.all(
    sites.map(async (site) => {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      await context.tracing.start({ screenshots: true, snapshots: true });
      const page = await browser.newPage();

      let totalSize = 0;

      // Listen for network responses and accumulate the total size
      page.on("response", async (response) => {
        const url = response.url();
        const headers = response.headers();
        const contentLength = headers["content-length"];

        if (response.status() === 200) {
          const contentType = headers["content-type"];
          for (const [header, value] of Object.entries(headers)) {
            // console.log(header);
            if (header.includes("cache-control")) {
              requestAnalysis.cache.total += 1;
            }
            if (contentType.includes("text/html")) {
              requestAnalysis.document.server = header["server"];

              if (header.startsWith("x")) {
                requestAnalysis.document.xHeaders.push({ header, value });
              }
            }
          }

          requestAnalysis.requests.total += 1;

          if (requestAnalysis.requests[contentType]) {
            requestAnalysis.requests[contentType] += 1;
          } else {
            requestAnalysis.requests[contentType] = 1;
          }

          if (contentLength) {
            const size = parseInt(contentLength, 10);
            if (requestAnalysis.biggestAsset.size < size) {
              requestAnalysis.biggestAsset.size = size;
              requestAnalysis.biggestAsset.contentType = contentType;
              requestAnalysis.biggestAsset.url = response.url();
            }

            totalSize += size;
          } else {
            const buffer = await response.body();

            if (requestAnalysis.biggestAsset.size < buffer) {
              requestAnalysis.biggestAsset.size = buffer;
              requestAnalysis.biggestAsset.contentType = contentType;
              requestAnalysis.biggestAsset.url = response.url();
            }

            totalSize += buffer.length;
          }
        } else {
          requestAnalysis.not200.total += 1;
          requestAnalysis.not200.requests.push({
            status: response.status(),
            url: response.url(),
          });
        }
      });

      await page.goto(site);

      await context.tracing.stop({ path: "trace.zip" });

      // Collect Navigation Timing metrics
      const timing = JSON.parse(
        await page.evaluate(() => JSON.stringify(window.performance.timing))
      );
      const TTFB = timing.responseStart - timing.connectStart;
      requestAnalysis.document.TTFB = TTFB;

      requestAnalysis.document.TTI =
        timing.domInteractive - timing.navigationStart;

      requestAnalysis.document.FCP =
        timing.responseStart - timing.navigationStart;

      requestAnalysis.document.DCL =
        timing.domContentLoadedEventStart - timing.navigationStart;

      requestAnalysis.document.L =
        timing.loadEventStart - timing.navigationStart;

      const cookies = await context.cookies();
      const localStorage = await page.evaluate(() => {
        let store = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          store[key] = localStorage.getItem(key);
        }
        return store;
      });
      const startTime = Date.now();

      try {
        const BASIC_FOLDER = "perf";
        const fullPathToCurrentHost = join(
          process.cwd(),
          BASIC_FOLDER,
          "currentWebsite"
        );
        const currentWebSite = fs
          .readFileSync(fullPathToCurrentHost, "utf-8")
          .replace(/\s/g, "")
          .replace(/\/$/, "");

        const folderName = currentWebSite
          .replace("https://", "")
          .replaceAll("/", "|");
        const currentFolder = join(process.cwd(), BASIC_FOLDER, folderName);
        const fullPath = join(process.cwd(), BASIC_FOLDER, "lastTest.json");

        fs.writeFileSync(
          fullPath,
          JSON.stringify({
            startTime,
            dateString: startTime,
            HOST: currentWebSite,
            folder: folderName,
          })
        );
        try {
          fs.mkdirSync(currentFolder);
        } catch (error) {}

        fs.writeFileSync(
          join(currentFolder, `requestsAnalysisAndTiming.json`),
          JSON.stringify({
            site,
            ...requestAnalysis,
            timing,
            cookies,
            localStorage,
          })
        );
      } catch (error) {
        console.log(error);
      }

      if (TTFB > DOCUMENT_RESPONSE_TIME_THRESHOLD) {
        console.log("Document response time " + TTFB);
      }

      // Collect Resource Timing metrics
      const resources = JSON.parse(
        await page.evaluate(() =>
          JSON.stringify(
            performance.getEntriesByType("resource").map((resource) => {
              const duration = resource.duration;
              const name = resource.name;
              //   if (requestAnalysis.slowestAsset.duration < duration) {
              //     requestAnalysis.slowestAsset.size = resource.transferSize;
              //     requestAnalysis.slowestAsset.contentType = contentType;
              //     requestAnalysis.slowestAsset.url = name;
              //     requestAnalysis.slowestAsset.duration = duration;
              //   }

              return {
                name,
                startTime: resource.startTime,
                duration,
              };
            })
          )
        )
      );

      console.log(`Total page weight: ${totalSize / 1000000} MB`);

      await browser.close();
    })
  );
}

requestsAnalysis();
