declare module "next-pwa" {
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: any[];
    cacheOnFrontEndNav?: boolean;
    reloadOnOnline?: boolean;
    scope?: string;
    sw?: string;
    buildExcludes?: string[];
  }

  function withPWA(config: PWAConfig): any;
  export = withPWA;
}