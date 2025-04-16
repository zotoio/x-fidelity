import * as vscode from 'vscode';
import { VSCodeNotificationProvider } from './notificationProvider';

// Define the Notification interface locally to avoid import issues
interface Notification {
  recipients: string[];
  subject: string;
  content: string;
  metadata?: Record<string, any>;
}

// Mock VS Code APIs
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn().mockResolvedValue(undefined),
        showWarningMessage: jest.fn().mockResolvedValue(undefined),
        showInformationMessage: jest.fn().mockResolvedValue(undefined)
    }
}));

describe('VSCodeNotificationProvider', () => {
    let notificationProvider: VSCodeNotificationProvider;
    let mockOutputChannel: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create mock output channel
        mockOutputChannel = {
            appendLine: jest.fn()
        };
        
        // Create notification provider with mock output channel
        notificationProvider = new VSCodeNotificationProvider(mockOutputChannel as any);
    });

    it('should log notification to output channel', async () => {
        // Create test notification
        const notification: Notification = {
            recipients: ['user1@example.com', 'user2@example.com'],
            subject: 'Test Subject',
            content: 'Test Content',
            metadata: {}
        };

        // Send notification
        await notificationProvider.send(notification);

        // Verify output channel was updated
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('--- X-Fidelity Notification ---');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Subject: Test Subject');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Content: Test Content');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Recipients: user1@example.com, user2@example.com');
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('-------------------------------');
    });

    it('should show error notification for error type', async () => {
        // Create test error notification
        const notification: Notification = {
            recipients: [],
            subject: 'Error Subject',
            content: 'Error Content',
            metadata: { isError: true }
        };

        // Send notification
        await notificationProvider.send(notification);

        // Verify error message was shown
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Error Subject', {
            detail: 'Error Content',
            modal: undefined
        });
    });

    it('should show warning notification for warning type', async () => {
        // Create test warning notification
        const notification: Notification = {
            recipients: [],
            subject: 'Warning Subject',
            content: 'Warning Content',
            metadata: { isWarning: true }
        };

        // Send notification
        await notificationProvider.send(notification);

        // Verify warning message was shown
        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Warning Subject', {
            detail: 'Warning Content',
            modal: undefined
        });
    });

    it('should show information notification by default', async () => {
        // Create test info notification
        const notification: Notification = {
            recipients: [],
            subject: 'Info Subject',
            content: 'Info Content',
            metadata: {}
        };

        // Send notification
        await notificationProvider.send(notification);

        // Verify info message was shown
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Info Subject', {
            detail: 'Info Content',
            modal: undefined
        });
    });

    it('should handle modal notifications', async () => {
        // Create test modal notification
        const notification: Notification = {
            recipients: [],
            subject: 'Modal Subject',
            content: 'Modal Content',
            metadata: { isModal: true }
        };

        // Send notification
        await notificationProvider.send(notification);

        // Verify modal parameter was passed
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Modal Subject', {
            detail: 'Modal Content',
            modal: true
        });
    });

    it('should return true on successful notification', async () => {
        // Create test notification
        const notification: Notification = {
            recipients: [],
            subject: 'Test Subject',
            content: 'Test Content',
            metadata: {}
        };

        // Send notification and check result
        const result = await notificationProvider.send(notification);
        expect(result).toBe(true);
    });

    it('should return false if notification fails', async () => {
        // Mock error in showInformationMessage
        (vscode.window.showInformationMessage as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

        // Create test notification
        const notification: Notification = {
            recipients: [],
            subject: 'Test Subject',
            content: 'Test Content',
            metadata: {}
        };

        // Mock console.error to avoid test output pollution
        const originalConsoleError = console.error;
        console.error = jest.fn();

        // Send notification and check result
        const result = await notificationProvider.send(notification);
        expect(result).toBe(false);

        // Restore console.error
        console.error = originalConsoleError;
    });
});
