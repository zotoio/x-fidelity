import * as vscode from 'vscode';
// Import as a type to avoid parsing issues
import type { Notification } from 'x-fidelity';

/**
 * VS Code notification provider for X-Fidelity
 * Implements a simple notification system using VS Code's notification API
 */
export class VSCodeNotificationProvider {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Send a notification using VS Code's notification system
     * @param notification The notification to send
     * @returns Promise resolving to true if the notification was sent successfully
     */
    public async send(notification: Notification): Promise<boolean> {
        try {
            // Log to output channel
            this.outputChannel.appendLine('--- X-Fidelity Notification ---');
            this.outputChannel.appendLine(`Subject: ${notification.subject}`);
            this.outputChannel.appendLine(`Content: ${notification.content}`);
            if (notification.recipients && notification.recipients.length > 0) {
                this.outputChannel.appendLine(`Recipients: ${notification.recipients.join(', ')}`);
            }
            this.outputChannel.appendLine('-------------------------------');

            // Determine notification type based on metadata
            const isError = notification.metadata?.isError === true;
            const isWarning = notification.metadata?.isWarning === true;

            // Show VS Code notification
            if (isError) {
                await vscode.window.showErrorMessage(notification.subject, {
                    detail: notification.content,
                    modal: notification.metadata?.isModal === true
                });
            } else if (isWarning) {
                await vscode.window.showWarningMessage(notification.subject, {
                    detail: notification.content,
                    modal: notification.metadata?.isModal === true
                });
            } else {
                await vscode.window.showInformationMessage(notification.subject, {
                    detail: notification.content,
                    modal: notification.metadata?.isModal === true
                });
            }

            return true;
        } catch (error) {
            console.error('Failed to send VS Code notification:', error);
            return false;
        }
    }
}
