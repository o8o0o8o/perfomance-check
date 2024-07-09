import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // console.log("GLOBAL TEARDOWN");
}

export default globalSetup;
