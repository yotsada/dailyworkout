const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        resolve(false);
      })
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
}

async function findFreePort(start, maxTries = 100) {
  let port = start;
  for (let i = 0; i < maxTries; i++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port);
    if (free) return port;
    port += 1;
  }
  throw new Error('No free port found');
}

async function main() {
  const requested = process.env.PORT ? Number(process.env.PORT) : 3000;
  const startPort = Number.isNaN(requested) ? 3000 : requested;
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    if (!fs.existsSync(buildIdPath)) {
      console.log('No production build found. Running next build first...');
      await new Promise((resolve, reject) => {
        const build = spawn('next', ['build'], { stdio: 'inherit', env: process.env, shell: true });
        build.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`next build exited with code ${code}`));
        });
        build.on('error', reject);
      });
    }

    const port = await findFreePort(startPort, 200);
    console.log(`Starting Next on port ${port} (requested ${startPort})`);
    const env = Object.assign({}, process.env, { PORT: String(port) });
    const child = spawn('next', ['start'], { stdio: 'inherit', env, shell: true });
    child.on('exit', (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      process.exit(code);
    });
  } catch (err) {
    console.error('Failed to find free port:', err);
    process.exit(1);
  }
}

main();
