/**
 * @fileoverview OpenCV.js loader for Node.js environment
 * @lastmodified 2025-08-02T03:00:00Z
 * 
 * Features: Lazy loading of OpenCV.js module for Node.js
 * Main APIs: loadOpenCV(), getCV()
 * Constraints: Requires @techstark/opencv-js package
 * Patterns: Singleton pattern for OpenCV instance
 */

let cv: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Load OpenCV.js module asynchronously in Node.js
 */
export async function loadOpenCV(): Promise<any> {
  if (cv) {
    return cv;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise(async (resolve, reject) => {
    try {
      // In Node.js, we need to handle the OpenCV module differently
      // The @techstark/opencv-js package provides pre-built bindings
      
      // First, let's try the simple approach
      try {
        // Try to import the module directly
        const opencvModule = await import('@techstark/opencv-js');
        cv = opencvModule.default || opencvModule;
        
        if (cv && typeof cv === 'object') {
          console.log('OpenCV.js loaded successfully');
          resolve(cv);
          return;
        }
      } catch (importError) {
        console.log('Direct import failed, trying require...');
      }

      // If direct import fails, try require
      const opencvPath = require.resolve('@techstark/opencv-js');
      delete require.cache[opencvPath]; // Clear cache to ensure fresh load
      
      // The opencv.js file needs to be evaluated in a specific way
      const fs = require('fs');
      const path = require('path');
      const vm = require('vm');
      
      // Read the OpenCV.js file
      const opencvDistPath = path.join(path.dirname(opencvPath), 'dist', 'opencv.js');
      const opencvCode = fs.readFileSync(opencvDistPath, 'utf8');
      
      // Create a context for OpenCV to run in
      const sandbox = {
        module: { exports: {} },
        exports: {},
        require: require,
        __dirname: path.dirname(opencvDistPath),
        __filename: opencvDistPath,
        process: process,
        global: global,
        console: console,
        cv: null
      };
      
      // Run the OpenCV code
      vm.createContext(sandbox);
      vm.runInContext(opencvCode, sandbox);
      
      // Get cv from various possible locations
      cv = sandbox.cv || sandbox.module.exports || sandbox.exports;
      
      if (!cv || typeof cv !== 'object') {
        throw new Error('Failed to load OpenCV.js - cv object not found or invalid');
      }

      console.log('OpenCV.js loaded successfully via VM');
      resolve(cv);
    } catch (error) {
      console.error('Failed to load OpenCV.js:', error);
      reject(error);
    }
  });

  return loadingPromise;
}

/**
 * Get the loaded OpenCV instance
 */
export function getCV(): any {
  if (!cv) {
    throw new Error('OpenCV.js not loaded. Call loadOpenCV() first.');
  }
  return cv;
}

/**
 * Check if OpenCV is available
 */
export function isOpenCVAvailable(): boolean {
  try {
    require.resolve('@techstark/opencv-js');
    return true;
  } catch {
    return false;
  }
}