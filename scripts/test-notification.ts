import { initializeNotifications } from '../src/notifications';
import { ResultMetadata } from '../src/types/typeDefs';

async function sendTestNotification() {
  // Test configuration
  const config = {
    enabled: true,
    providers: ['email'],
    notifyOnSuccess: true,
    notifyOnFailure: true
  };

  // Initialize notification system
  const notificationManager = await initializeNotifications(config);

  // Create mock results
  const mockResults: ResultMetadata = {
    XFI_RESULT: {
      archetype: 'test-archetype',
      repoPath: '/test/repo',
      fileCount: 10,
      totalIssues: 2,
      warningCount: 1,
      errorCount: 1,
      fatalityCount: 0,
      exemptCount: 0,
      issueDetails: [
        {
          filePath: 'src/test.ts',
          errors: [
            {
              ruleFailure: 'TestRule',
              level: 'warning',
              details: {
                message: 'Test warning message'
              }
            }
          ]
        }
      ],
      startTime: Date.now(),
      finishTime: Date.now() + 1000,
      durationSeconds: 1,
      telemetryData: {
        repoUrl: 'https://github.com/test/repo',
        configServer: 'none',
        hostInfo: {
          platform: 'test',
          release: '1.0',
          type: 'test',
          arch: 'x64',
          cpus: 4,
          totalMemory: 8000000000,
          freeMemory: 4000000000
        },
        userInfo: {
          username: 'test',
          homedir: '/home/test',
          shell: '/bin/bash'
        },
        startTime: Date.now()
      },
      options: {},
      repoXFIConfig: {
        sensitiveFileFalsePositives: []
      },
      memoryUsage: {},
      repoUrl: 'https://github.com/test/repo',
      xfiVersion: '1.0.0'
    }
  };

  // Send test notification
  await notificationManager.sendReport(
    mockResults,
    ['src/test.ts', 'src/another.ts']
  );

  console.log('Test notification sent!');
}

// Run the test
sendTestNotification().catch(console.error);
