/// <reference types="react-scripts" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Extend the Window interface to include node Buffer
declare global {
  namespace NodeJS {
    interface Global {
      Buffer: typeof Buffer;
    }
  }
  
  interface Window {
    Buffer: typeof Buffer;
  }
}

// Define the axios module since we're using it but types aren't available
declare module 'axios' {
  import * as axios from 'axios';
  export = axios;
}