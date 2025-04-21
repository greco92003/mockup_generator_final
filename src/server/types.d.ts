declare module 'cloudconvert' {
  export default class CloudConvert {
    constructor(apiKey: string, sandbox?: boolean);
    
    jobs: {
      create: (options: any) => Promise<any>;
      wait: (jobId: string) => Promise<any>;
      getExportUrls: (job: any) => Array<{url: string, filename: string}>;
    };
    
    tasks: {
      upload: (task: any, data: Buffer, filename: string, size: number) => Promise<any>;
    };
  }
}
