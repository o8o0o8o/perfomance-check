import { test, Page, TestInfo } from "@playwright/test";
import fs from "fs";
import { join } from "path";

export const DETAILED_PERFORMANCE_POSTFIX = "detailed";

type Test = { name: string; value: number };

type Devices = {
  mobile: Test[];
  desktop: Test[];
};

type Results = {
  slow3g: { cpu6x: Devices; cpu4x: Devices; normal: Devices };
  fast3g: { cpu6x: Devices; cpu4x: Devices; normal: Devices };
  slow4g: { cpu6x: Devices; cpu4x: Devices; normal: Devices };
  normal: { cpu6x: Devices; cpu4x: Devices; normal: Devices };
};

type Network = {
  download: number;
  upload: number;
  latency: number;
  noThrottle?: boolean;
  name: keyof Results;
  weight: number;
};

type CPU = {
  rate?: number;
  noThrottle?: boolean;
  name: keyof Results["slow3g"];
  weight: number;
};

const lastTestFileName = "lastTest.json";
const BASIC_FOLDER = "perf";
const fullPath = join(process.cwd(), BASIC_FOLDER, lastTestFileName);
const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
const HOST = data.HOST;
const currentFolder = join(process.cwd(), BASIC_FOLDER, data.folder);

async function basicTest(
  page: Page,
  network: Network,
  cpu: CPU,
  testInfo: TestInfo
) {
  //Create a new connection to an existing CDP session to enable performance Metrics
  const session = await page.context().newCDPSession(page);
  //To tell the CDPsession to record performance metrics.
  await session.send("Performance.enable");

  if (!cpu.noThrottle && cpu.rate) {
    await session.send("Emulation.setCPUThrottlingRate", { rate: cpu.rate });
  }

  if (!network.noThrottle) {
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: network.download,
      uploadThroughput: network.upload,
      latency: network.latency,
    });
  }

  await page.goto(HOST);

  const LCP = await page.evaluate(
    () =>
      new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries.at(-1);

          return resolve(Number(lcp?.startTime).toFixed(2));
        }).observe({
          type: "largest-contentful-paint",
          buffered: true,
        });
      })
  );

  // const CLS = await page.evaluate(() =>
  //   new PerformanceObserver((list) => {
  //     for (const entry of list.getEntries()) {
  //       if (!entry.hadRecentInput) {
  //         return entry;
  //       }
  //     }
  //   }).observe({ type: "layout-shift", buffered: true })
  // );

  // const longTasks = await page.evaluate(
  //   () =>
  //     new Promise((resolve) => {
  //       new PerformanceObserver((list) => {
  //         for (const entry of list.getEntries()) {
  //           return entry;
  //         }
  //       }).observe({ type: "longtask", buffered: true });
  //     })
  // );

  const L = await page.evaluate(
    () =>
      new Promise((resolve) => {
        new PerformanceObserver((list) => {
          let max = 0;

          list.getEntries().forEach((entry) => {
            if (max < entry.duration) {
              max = entry.duration;
            }
          });

          return resolve(max.toFixed(2));
        }).observe({
          type: "navigation",
          buffered: true,
        });
      })
  );

  const paintTimingJson = await page.evaluate(() =>
    JSON.stringify(window.performance.getEntriesByType("paint"))
  );

  const paintTiming = await JSON.parse(paintTimingJson);

  const perData = {
    LCP,
    FCP: "",
    DCL: "",
    L,
    weight: network.weight + cpu.weight,
  };

  for (const metric of paintTiming) {
    if (metric.name === "first-contentful-paint") {
      perData.FCP = metric.startTime.toFixed(2);
    }
  }

  const performanceMetrics = await session.send("Performance.getMetrics");

  results[network.name][cpu.name][testInfo.project.name as keyof Devices] =
    performanceMetrics.metrics;

  paintTiming.forEach((element: any) => {
    results[network.name][cpu.name][
      testInfo.project.name as keyof Devices
    ].push({
      name: element.name,
      value: element.startTime,
    });
  });

  for (const metric of performanceMetrics.metrics) {
    if (metric.name === "DomContentLoaded") {
      perData.DCL = metric.value.toFixed(2);
    }
  }

  const timeStamp = Date.now();

  fs.writeFileSync(
    join(
      currentFolder,
      `${network.name} ${cpu.name} ${testInfo.project.name} __${timeStamp}__${DETAILED_PERFORMANCE_POSTFIX}.json`
    ),
    JSON.stringify(perData)
  );
}

const networkConditions = {
  slow3g: {
    download: ((500 * 1000) / 8) * 0.8,
    upload: ((500 * 1000) / 8) * 0.8,
    latency: 400 * 5,
    name: "slow3g" as keyof Results,
    weight: 4,
  },
  fast3g: {
    download: ((1.6 * 1000 * 1000) / 8) * 0.9,
    upload: ((750 * 1000) / 8) * 0.9,
    latency: 150 * 3.75,
    name: "fast3g" as keyof Results,
    weight: 3,
  },
  slow4g: {
    download: ((1.6 * 1000 * 1000) / 8) * 1.5,
    upload: ((750 * 1000) / 8) * 1.5,
    latency: 150,
    name: "slow4g" as keyof Results,
    weight: 2,
  },
  normal: {
    download: 10000000000,
    upload: 100000000000,
    latency: 0,
    name: "normal" as keyof Results,
    noThrottle: true,
    weight: 1,
  },
};

const cpuConditions = {
  cpu6x: { rate: 6, name: "cpu6x" as keyof Results["slow3g"], weight: 30 },
  cpu4x: { rate: 4, name: "cpu4x" as keyof Results["slow3g"], weight: 20 },
  normal: {
    noThrottle: true,
    name: "normal" as keyof Results["slow3g"],
    weight: 10,
  },
};

const fileName = "perf.json";
const results: Results = {
  slow3g: {
    cpu6x: {
      mobile: [],
      desktop: [],
    },
    cpu4x: {
      mobile: [],
      desktop: [],
    },
    normal: {
      mobile: [],
      desktop: [],
    },
  },
  fast3g: {
    cpu6x: {
      mobile: [],
      desktop: [],
    },
    cpu4x: {
      mobile: [],
      desktop: [],
    },
    normal: {
      mobile: [],
      desktop: [],
    },
  },
  slow4g: {
    cpu6x: {
      mobile: [],
      desktop: [],
    },
    cpu4x: {
      mobile: [],
      desktop: [],
    },
    normal: {
      mobile: [],
      desktop: [],
    },
  },
  normal: {
    cpu6x: {
      mobile: [],
      desktop: [],
    },
    cpu4x: {
      mobile: [],
      desktop: [],
    },
    normal: {
      mobile: [],
      desktop: [],
    },
  },
};

for (const networkDetails of Object.values(networkConditions)) {
  for (const cpuDetails of Object.values(cpuConditions)) {
    test(`Get performance metrics for network: ${
      networkDetails.name !== "normal" ? networkDetails.name : "no throttle"
    } and cpu: ${
      cpuDetails.name !== "normal" ? `slow ${cpuDetails.name}` : "no throttle"
    }`, async ({ page }, workerInfo) => {
      await basicTest(
        page,
        networkConditions[networkDetails.name],
        cpuConditions[cpuDetails.name],
        workerInfo
      );
    });
  }
}
