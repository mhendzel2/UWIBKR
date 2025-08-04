import { signalProcessor } from './server/services/signalProcessor.js';

console.log('🧪 Testing Signal Processor with fixes...');

// Test the signal processor directly
async function testSignalProcessor() {
    try {
        console.log('Starting signal processor...');
        await signalProcessor.startProcessing();
        
        // Let it run for 30 seconds to see if we get any alerts
        setTimeout(() => {
            console.log('Stopping signal processor...');
            signalProcessor.stopProcessing();
            
            const stats = signalProcessor.getProcessingStats();
            console.log('Final stats:', stats);
            
            process.exit(0);
        }, 30000);
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testSignalProcessor();
