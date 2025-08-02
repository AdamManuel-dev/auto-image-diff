/**
 * Type definitions for @techstark/opencv-js
 * Minimal types needed for feature detection and alignment
 */

declare module 'opencv.js' {
  const cv: any;
  export default cv;
}

declare module '@techstark/opencv-js' {
  export class Mat {
    constructor();
    constructor(rows: number, cols: number, type: number);
    delete(): void;
    empty(): boolean;
    data: Uint8Array;
    data64F: Float64Array;
    cols: number;
    rows: number;
    size(): { width: number; height: number };
  }

  export class KeyPointVector {
    constructor();
    delete(): void;
    size(): number;
    get(index: number): KeyPoint;
  }

  export class DMatchVector {
    constructor();
    delete(): void;
    size(): number;
    get(index: number): DMatch;
    push_back(match: DMatch): void;
  }

  export class Point2fVector {
    constructor();
    delete(): void;
    size(): number;
    get(index: number): Point2f;
    push_back(point: Point2f): void;
  }

  export class PointVector {
    constructor();
    delete(): void;
    size(): number;
    get(index: number): Point;
    push_back(point: Point): void;
  }

  export interface KeyPoint {
    pt: Point2f;
    size: number;
    angle: number;
    response: number;
    octave: number;
    class_id: number;
  }

  export interface DMatch {
    queryIdx: number;
    trainIdx: number;
    imgIdx: number;
    distance: number;
  }

  export interface Point2f {
    x: number;
    y: number;
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export class Size {
    constructor(width: number, height: number);
  }

  export interface Scalar {
    constructor(v0: number, v1: number, v2: number, v3: number);
  }

  export class Scalar {
    constructor(v0: number, v1: number, v2: number, v3: number);
  }

  // Feature detectors
  export class ORB {
    constructor(nfeatures?: number);
    detectAndCompute(image: Mat, mask: Mat, keypoints: KeyPointVector, descriptors: Mat): void;
    delete(): void;
  }

  export class AKAZE {
    constructor();
    detectAndCompute(image: Mat, mask: Mat, keypoints: KeyPointVector, descriptors: Mat): void;
    delete(): void;
  }

  export class BRISK {
    constructor();
    detectAndCompute(image: Mat, mask: Mat, keypoints: KeyPointVector, descriptors: Mat): void;
    delete(): void;
  }

  // Matcher
  export class BFMatcher {
    constructor(normType: number, crossCheck: boolean);
    match(queryDescriptors: Mat, trainDescriptors: Mat, matches: DMatchVector): void;
    delete(): void;
  }

  // Constants
  export const COLOR_RGBA2GRAY: number;
  export const COLOR_RGB2GRAY: number;
  export const COLOR_BGR2GRAY: number;
  export const NORM_HAMMING: number;
  export const NORM_L2: number;
  export const RANSAC: number;
  export const CV_64F: number;
  export const CV_32F: number;
  export const CV_8U: number;
  export const CV_8UC1: number;
  export const CV_8UC3: number;
  export const CV_8UC4: number;
  export const INTER_LINEAR: number;
  export const BORDER_CONSTANT: number;

  // Functions
  export function cvtColor(src: Mat, dst: Mat, code: number): void;
  export function findHomography(srcPoints: Point2fVector, dstPoints: Point2fVector, method: number, ransacReprojThreshold: number): Mat;
  export function warpPerspective(src: Mat, dst: Mat, M: Mat, dsize: Size, flags?: number, borderMode?: number, borderValue?: Scalar): void;
  export function matFromImageData(imageData: ImageData): Mat;
  export function matFromArray(rows: number, cols: number, type: number, array: number[]): Mat;
  
  // Runtime
  export function getBuildInformation(): string;
  export let onRuntimeInitialized: () => void;
}