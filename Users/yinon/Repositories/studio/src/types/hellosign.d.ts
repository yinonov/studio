// src/types/hellosign.d.ts

// This file extends the global Window interface to include the HelloSign object
// that is loaded from the external Dropbox Sign script. This allows TypeScript
// to recognize `window.HelloSign` without causing compilation errors.

declare global {
  interface Window {
    // The HelloSign object can be complex. Using 'any' is a straightforward way 
    // to make it available. For stricter typing, you could define the full interface
    // based on the hellosign-embedded library's documentation.
    HelloSign?: any;
  }
}

// This export statement is necessary to make this file a module,
// which is required for global declarations to work correctly in TypeScript.
export {};
