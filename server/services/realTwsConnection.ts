import net from 'net';

export interface TWSConnectionTest {
  host: string;
  port: number;
  isReachable: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Test actual TWS connection on the specified host and port
 */
export async function testTWSConnection(
  host: string = 'localhost',
  port: number = 7497
): Promise<TWSConnectionTest> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({
        host,
        port,
        isReachable: false,
        responseTime: Date.now() - startTime,
        error: 'Connection timeout'
      });
    }, 5000);

    socket.connect(port, host, () => {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      socket.destroy();
      
      resolve({
        host,
        port,
        isReachable: true,
        responseTime,
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      socket.destroy();
      
      resolve({
        host,
        port,
        isReachable: false,
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });
  });
}

/**
 * Test multiple TWS ports (IB Gateway uses 4001, TWS uses 7497)
 */
export async function testAllTWSPorts(host: string = 'localhost'): Promise<TWSConnectionTest[]> {
  const ports = [7497, 4001]; // TWS and IB Gateway default ports
  
  const tests = await Promise.all(
    ports.map(port => testTWSConnection(host, port))
  );
  
  return tests;
}