import { createDefaultPreset } from "ts-jest";

/** @type {import("jest").Config} **/
export default {
  ...createDefaultPreset(),
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
};