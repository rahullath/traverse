/**
 * Vitest Test Setup
 *
 * Global setup for all tests including DOM matchers and environment configuration
 */

import "@testing-library/jest-dom";
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables if needed
process.env.NODE_ENV = "test";
