/// <reference types="unlighthouse" />
import { defineConfig } from "unlighthouse";

export default defineConfig({
  scanner: {
    // run lighthouse for each URL 3 times
    // samples: 3,
    // use desktop to scan
    device: "mobile",
    // enable the throttling mode
    throttle: true,
  },
  cache: false,
  debug: true,
  hooks: {
    "worker-finished": () => {
      process.exit(0);
    },
  },
  chrome: {
    // forces the fallback to be used
    useSystem: false,
  },
});
