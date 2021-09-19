export interface ServerConfig {
    loginUri: string;
    upverterUri: string;
    autoBsp: boolean;
    storeFront: boolean;
    promotion: boolean; // Use promotion controller.
    featuredTemplates: number[];
}
