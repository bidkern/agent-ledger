/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("agentLedgerDesktop", {
  platform: process.platform,
  shell: "electron",
});
