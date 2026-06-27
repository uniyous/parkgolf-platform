import { Injectable, Logger, Inject, Optional, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import * as admin from 'firebase-admin';

interface DeviceToken {
  platform: 'IOS' | 'ANDROID' | 'WEB';
  token: string;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface PushResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private isFirebaseInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject('IAM_SERVICE') private readonly iamServiceClient?: ClientProxy,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      this.isFirebaseInitialized = true;
      this.logger.log('Firebase Admin SDK already initialized');
      return;
    }

    try {
      // Option 1: GCP_SA_KEY (base64 encoded or JSON string)
      const gcpSaKey = this.configService.get<string>('GCP_SA_KEY');
      if (gcpSaKey) {
        const credential = this.parseGcpSaKey(gcpSaKey);
        if (credential) {
          admin.initializeApp({
            credential: admin.credential.cert(credential),
          });
          this.isFirebaseInitialized = true;
          this.logger.log('Firebase Admin SDK initialized with GCP_SA_KEY');
          return;
        }
      }

      // Option 2: Individual Firebase credentials
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.isFirebaseInitialized = true;
        this.logger.log('Firebase Admin SDK initialized with individual credentials');
        return;
      }

      // Option 3: GOOGLE_APPLICATION_CREDENTIALS file path
      const googleCredPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
      if (googleCredPath) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.isFirebaseInitialized = true;
        this.logger.log('Firebase Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS');
        return;
      }

      this.logger.warn('Firebase credentials not configured. Push notifications will be simulated.');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
  }

  private parseGcpSaKey(gcpSaKey: string): admin.ServiceAccount | null {
    try {
      // Try parsing as JSON string first
      let parsed: Record<string, unknown>;

      try {
        parsed = JSON.parse(gcpSaKey);
      } catch {
        // Try base64 decoding
        const decoded = Buffer.from(gcpSaKey, 'base64').toString('utf-8');
        parsed = JSON.parse(decoded);
      }

      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id as string,
          clientEmail: parsed.client_email as string,
          privateKey: (parsed.private_key as string).replace(/\\n/g, '\n'),
        };
      }

      this.logger.error('GCP_SA_KEY missing required fields (project_id, client_email, private_key)');
      return null;
    } catch (error) {
      this.logger.error(`Failed to parse GCP_SA_KEY: ${error.message}`);
      return null;
    }
  }

  /**
   * 사용자의 디바이스 토큰 조회 (iam-service 호출)
   */
  async getDeviceTokens(userId: string): Promise<DeviceToken[]> {
    if (!this.iamServiceClient) {
      this.logger.warn('IAM_SERVICE client not available');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.iamServiceClient.send('users.devices.tokens', { userId: parseInt(userId) }).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.error(`Failed to get device tokens for user ${userId}: ${err.message}`);
            return of({ success: false, data: [] });
          }),
        ),
      );

      if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      this.logger.error(`Error fetching device tokens: ${error.message}`);
      return [];
    }
  }

  /**
   * Push 알림 전송
   */
  async sendPushNotification(userId: string, payload: PushPayload): Promise<PushResult> {
    const tokens = await this.getDeviceTokens(userId);

    if (tokens.length === 0) {
      this.logger.log(`No device tokens found for user ${userId}`);
      return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    this.logger.log(`Sending push notification to user ${userId} (${tokens.length} devices)`);

    if (!this.isFirebaseInitialized) {
      // Simulate push notification
      this.logger.log(`[SIMULATED] Push sent to ${tokens.length} devices: ${payload.title}`);
      return { successCount: tokens.length, failureCount: 0, failedTokens: [] };
    }

    return this.sendFcmMulticast(tokens, payload);
  }

  /**
   * FCM Multicast 전송
   */
  private async sendFcmMulticast(tokens: DeviceToken[], payload: PushPayload): Promise<PushResult> {
    const fcmTokens = tokens.map((t) => t.token);
    const failedTokens: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        // iOS specific settings
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        // Android specific settings
        android: {
          notification: {
            channelId: 'default',
            priority: 'high',
            sound: 'default',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      successCount = response.successCount;
      failureCount = response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx]);
          this.logger.warn(`FCM send failed for token: ${resp.error?.message}`);
        }
      });

      this.logger.log(`FCM multicast result: ${successCount} success, ${failureCount} failures`);
    } catch (error) {
      this.logger.error(`FCM multicast error: ${error.message}`);
      failureCount = fcmTokens.length;
    }

    return { successCount, failureCount, failedTokens };
  }

  /**
   * 토큰 유효성 확인 (선택적 기능)
   */
  async validateToken(token: string): Promise<boolean> {
    if (!this.isFirebaseInitialized) {
      return true; // Skip validation if Firebase is not initialized
    }

    try {
      // Dry-run을 통한 토큰 유효성 확인
      await admin.messaging().send(
        {
          token,
          notification: { title: 'test', body: 'test' },
        },
        true, // dryRun
      );
      return true;
    } catch {
      return false;
    }
  }
}
