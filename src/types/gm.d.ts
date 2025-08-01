/**
 * @fileoverview Custom type declarations for gm module
 * @lastmodified 2025-08-01T04:00:00Z
 * 
 * Features: TypeScript type definitions for GraphicsMagick/ImageMagick
 * Main APIs: gm module type definitions
 * Constraints: Partial definitions for our use case
 * Patterns: TypeScript declaration file
 */

declare module 'gm' {
  interface CompareOptions {
    metric?: string;
    subimage_search?: boolean;
    file?: string;
    highlightColor?: string;
    lowlight?: boolean;
  }

  interface Size {
    width: number;
    height: number;
  }

  interface State {
    compare(targetImage: string, options: CompareOptions, callback: (err: any, isEqual: any, equality: any, raw: any) => void): void;
    geometry(geometry: string): State;
    write(outputPath: string, callback: (err: any) => void): void;
    size(callback: (err: any, size: Size) => void): void;
  }

  interface SubClass {
    (imagePath: string): State;
  }

  interface GM {
    subClass(options: { imageMagick: boolean }): SubClass;
  }

  const gm: GM;
  export = gm;
}