/**
 * @fileoverview Tests for smart file pairing algorithm
 * @lastmodified 2025-08-01T18:35:00Z
 */

import { SmartPairing } from "../../lib/smart-pairing";

describe("SmartPairing", () => {
  let pairing: SmartPairing;

  beforeEach(() => {
    pairing = new SmartPairing();
  });

  describe("findBestPairs", () => {
    it("should match identical filenames", () => {
      const referenceFiles = [
        "/ref/image1.png",
        "/ref/image2.png",
        "/ref/image3.png",
      ];
      const targetFiles = [
        "/target/image1.png",
        "/target/image2.png",
        "/target/image3.png",
      ];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(3);
      expect(pairs[0].similarity).toBe(1.0);
      expect(pairs[0].reference).toBe("/ref/image1.png");
      expect(pairs[0].target).toBe("/target/image1.png");
    });

    it("should match files with different cases when case insensitive", () => {
      const referenceFiles = ["/ref/HomePage.png", "/ref/AboutPage.png"];
      const targetFiles = ["/target/homepage.png", "/target/aboutpage.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(2);
      expect(pairs[0].similarity).toBeGreaterThan(0.9);
    });

    it("should not match files with different cases when case sensitive", () => {
      pairing = new SmartPairing({ caseSensitive: true });
      
      const referenceFiles = ["/ref/HomePage.png"];
      const targetFiles = ["/target/homepage.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(0);
    });

    it("should match files with similar names using fuzzy matching", () => {
      const referenceFiles = [
        "/ref/home-page.png",
        "/ref/about_us.png",
        "/ref/contact.form.png",
      ];
      const targetFiles = [
        "/target/home_page.png",
        "/target/about-us.png",
        "/target/contact_form.png",
      ];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(3);
      pairs.forEach(pair => {
        expect(pair.similarity).toBeGreaterThan(0.7);
      });
    });

    it("should ignore extensions when option is set", () => {
      pairing = new SmartPairing({ ignoreExtensions: true });
      
      const referenceFiles = ["/ref/image.png"];
      const targetFiles = ["/target/image.jpg"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(1);
      expect(pairs[0].similarity).toBe(1.0);
    });

    it("should respect minimum similarity threshold", () => {
      pairing = new SmartPairing({ minSimilarity: 0.9 });
      
      const referenceFiles = ["/ref/homepage.png"];
      const targetFiles = ["/target/home.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(0);
    });

    it("should not reuse target files", () => {
      const referenceFiles = ["/ref/image.png", "/ref/image-copy.png"];
      const targetFiles = ["/target/image.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(1);
    });

    it("should handle empty arrays", () => {
      const pairs = pairing.findBestPairs([], [], "/ref", "/target");
      expect(pairs).toHaveLength(0);
    });
  });

  describe("similarity calculation", () => {
    it("should give high score to identical names", () => {
      const pairs = pairing.findBestPairs(
        ["/ref/exact-match.png"],
        ["/target/exact-match.png"],
        "/ref",
        "/target"
      );

      expect(pairs[0].similarity).toBe(1.0);
    });

    it("should give high score to names with common prefix", () => {
      // Create new instance to ensure minSimilarity is set
      pairing = new SmartPairing({ minSimilarity: 0.3 });
      
      const pairs = pairing.findBestPairs(
        ["/ref/homepage-v1.png"],
        ["/target/homepage-v2.png"],
        "/ref",
        "/target"
      );

      expect(pairs).toHaveLength(1);
      expect(pairs[0].similarity).toBeGreaterThan(0.5);
    });

    it("should give high score to names with common suffix", () => {
      // Lower threshold for this test case
      pairing = new SmartPairing({ minSimilarity: 0.3 });
      
      const pairs = pairing.findBestPairs(
        ["/ref/old-homepage.png"],
        ["/target/new-homepage.png"],
        "/ref",
        "/target"
      );

      expect(pairs).toHaveLength(1);
      expect(pairs[0].similarity).toBeGreaterThan(0.4);
    });

    it("should handle token-based matching", () => {
      // Lower threshold for token matching
      pairing = new SmartPairing({ minSimilarity: 0.4 });
      
      const pairs = pairing.findBestPairs(
        ["/ref/user-profile-settings.png"],
        ["/target/settings-user-profile.png"],
        "/ref",
        "/target"
      );

      expect(pairs).toHaveLength(1);
      expect(pairs[0].similarity).toBeGreaterThan(0.4);
    });
  });

  describe("findUnpairedFiles", () => {
    it("should identify unpaired files correctly", () => {
      const referenceFiles = [
        "/ref/image1.png",
        "/ref/image2.png",
        "/ref/image3.png",
      ];
      const targetFiles = [
        "/target/image1.png",
        "/target/image4.png",
      ];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");
      const unpaired = pairing.findUnpairedFiles(referenceFiles, targetFiles, pairs);

      expect(unpaired.unpairedReference).toEqual(["/ref/image2.png", "/ref/image3.png"]);
      expect(unpaired.unpairedTarget).toEqual(["/target/image4.png"]);
    });

    it("should handle all files paired", () => {
      const referenceFiles = ["/ref/image1.png"];
      const targetFiles = ["/target/image1.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");
      const unpaired = pairing.findUnpairedFiles(referenceFiles, targetFiles, pairs);

      expect(unpaired.unpairedReference).toHaveLength(0);
      expect(unpaired.unpairedTarget).toHaveLength(0);
    });
  });

  describe("generatePairingReport", () => {
    it("should generate comprehensive report", () => {
      const referenceFiles = [
        "/ref/home.png",
        "/ref/about.png",
        "/ref/contact.png",
      ];
      const targetFiles = [
        "/target/home.png",
        "/target/services.png",
      ];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");
      const unpaired = pairing.findUnpairedFiles(referenceFiles, targetFiles, pairs);
      const report = pairing.generatePairingReport(pairs, unpaired);

      expect(report).toContain("Smart Pairing Report");
      expect(report).toContain("Total pairs found: 1");
      expect(report).toContain("Unpaired reference files: 2");
      expect(report).toContain("Unpaired target files: 1");
      expect(report).toContain("home.png <-> home.png");
      expect(report).toContain("about.png");
      expect(report).toContain("contact.png");
      expect(report).toContain("services.png");
    });

    it("should handle empty pairs", () => {
      const report = pairing.generatePairingReport([], {
        unpairedReference: [],
        unpairedTarget: [],
      });

      expect(report).toContain("Total pairs found: 0");
    });
  });

  describe("edge cases", () => {
    it("should handle special characters in filenames", () => {
      const referenceFiles = ["/ref/file@#$%.png"];
      const targetFiles = ["/target/file@#$%.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(1);
      expect(pairs[0].similarity).toBe(1.0);
    });

    it("should handle nested paths", () => {
      const referenceFiles = ["/ref/folder1/folder2/image.png"];
      const targetFiles = ["/target/folder1/folder2/image.png"];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(1);
      expect(pairs[0].relativePath).toBe("folder1/folder2/image.png");
    });

    it("should handle very long filenames", () => {
      const longName = "a".repeat(100) + ".png";
      const referenceFiles = [`/ref/${longName}`];
      const targetFiles = [`/target/${longName}`];

      const pairs = pairing.findBestPairs(referenceFiles, targetFiles, "/ref", "/target");

      expect(pairs).toHaveLength(1);
      expect(pairs[0].similarity).toBe(1.0);
    });
  });
});