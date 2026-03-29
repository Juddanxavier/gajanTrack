const { spawnSync } = require('child_process');
const url = 'http://backend-r88koogcc0oss4owcgg0cg4c.51.210.245.120.sslip.io';
const key = 'self-hosted-convex|012e46b092347941eed3403877a6e2b74a89c39a56e89069871c74d368d724121a9c6bea30';

console.log("Running convex run seedUser:seed using spawnSync...");
const result = spawnSync('npx.cmd', ['convex', 'run', 'seedUser:seed', '--url', url, '--admin-key', key], { 
    stdio: 'inherit',
    encoding: 'utf-8'
});

if (result.status === 0) {
    console.log("Success!");
} else {
    console.error("Execution failed with status:", result.status);
    process.exit(1);
}
