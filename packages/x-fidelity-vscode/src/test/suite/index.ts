import * as path from 'path';
import { spawn } from 'child_process';

export function run(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('Running VSCode Extension Tests via Jest...');
        
        // Get the VSCode package root directory
        const packageRoot = path.resolve(__dirname, '../../..');
        
        // Run Jest tests using yarn
        const testProcess = spawn('yarn', ['test'], {
            cwd: packageRoot,
            stdio: 'inherit',
            shell: true
        });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                console.log('All tests passed!');
                resolve();
            } else {
                reject(new Error(`Tests failed with exit code ${code}`));
            }
        });
        
        testProcess.on('error', (error) => {
            reject(error);
        });
    });
}
