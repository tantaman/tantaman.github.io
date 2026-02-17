export type WhatsAppMessage = {
  from: string;
  body: string;
  timestamp: Date;
};

export interface WhatsAppProvider {
  registerWebhook(
    app: any,
    path: string,
    onMessage: (msg: WhatsAppMessage) => void,
  ): void;
  verifyWebhook(req: any): boolean;
}

export class StubProvider implements WhatsAppProvider {
  registerWebhook(
    app: any,
    path: string,
    onMessage: (msg: WhatsAppMessage) => void,
  ): void {
    console.log(`[StubProvider] Registered webhook at ${path}`);
  }

  verifyWebhook(_req: any): boolean {
    console.log('[StubProvider] verifyWebhook called — returning true');
    return true;
  }
}
