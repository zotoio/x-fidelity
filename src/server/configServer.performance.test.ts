import axios from 'axios';
import { startServer } from './configServer';

const BASE_URL = 'http://localhost:8888';

describe('Config Server Performance Tests', () => {
  beforeAll(async () => {
    // Start the server
    startServer('8888');
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    // Stop the server (you might need to implement a stop method in configServer.ts)
  });

  it('should handle multiple concurrent requests efficiently', async () => {
    const numRequests = 100;
    const startTime = Date.now();

    const requests = Array(numRequests).fill(null).map(() => 
      axios.get(`${BASE_URL}/archetypes/node-fullstack`)
    );

    await Promise.all(requests);

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / numRequests;

    console.log(`Total time for ${numRequests} requests: ${totalTime}ms`);
    console.log(`Average time per request: ${averageTime}ms`);

    expect(averageTime).toBeLessThan(50); // Expecting each request to take less than 50ms on average
  });

  it('should maintain performance under sustained load', async () => {
    const numRequests = 1000;
    const startTime = Date.now();

    for (let i = 0; i < numRequests; i++) {
      await axios.get(`${BASE_URL}/archetypes/node-fullstack`);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / numRequests;

    console.log(`Total time for ${numRequests} sequential requests: ${totalTime}ms`);
    console.log(`Average time per request: ${averageTime}ms`);

    expect(averageTime).toBeLessThan(20); // Expecting each request to take less than 20ms on average
  });
});
