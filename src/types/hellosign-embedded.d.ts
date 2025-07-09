declare module 'hellosign-embedded' {
  interface HelloSignOptions {
    clientId: string;
    [key: string]: any;
  }

  interface HelloSignInstance {
    open: (url: string, options?: any) => void;
    close: () => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
    [key: string]: any;
  }

  interface HelloSignConstructor {
    new (options: HelloSignOptions): HelloSignInstance;
    init: (clientId: string) => void;
    open: (url: string, options?: any) => void;
    close: () => void;
    [key: string]: any;
  }

  const HelloSign: HelloSignConstructor;

  export default HelloSign;
}
