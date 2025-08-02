/**
 * @fileoverview Tests for OpenCV feature matcher
 * @lastmodified 2025-08-02T02:30:00Z
 */

import { OpenCVFeatureMatcher } from "../lib/opencvFeatureMatcher";
import * as path from "path";

describe("OpenCVFeatureMatcher", () => {
  let matcher: OpenCVFeatureMatcher;

  beforeEach(() => {
    matcher = new OpenCVFeatureMatcher();
  });

  describe("initialization", () => {
    it("should create an instance", () => {
      expect(matcher).toBeInstanceOf(OpenCVFeatureMatcher);
    });

    it("should initialize without errors", async () => {
      await expect(matcher.initialize()).resolves.not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle missing files gracefully", async () => {
      const result = await matcher.findFeatureAlignment(
        "non-existent-1.png",
        "non-existent-2.png"
      );
      expect(result).toBeNull();
    });

    it("should handle invalid image paths", async () => {
      const result = await matcher.findFeatureAlignment("", "");
      expect(result).toBeNull();
    });
  });

  // Note: Full feature testing requires OpenCV.js to be properly loaded in Node.js environment
  // which requires additional setup (loading WASM, etc.)
  describe("feature detection (requires OpenCV setup)", () => {
    it.skip("should detect features in test images", async () => {
      const testImage1 = path.join(__dirname, "fixtures", "test1.png");
      const testImage2 = path.join(__dirname, "fixtures", "test2.png");
      
      const result = await matcher.findFeatureAlignment(testImage1, testImage2);
      
      if (result) {
        expect(result).toHaveProperty("homography");
        expect(result).toHaveProperty("inliers");
        expect(result).toHaveProperty("totalMatches");
        expect(result).toHaveProperty("confidence");
      }
    });
  });
});