import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';

const url = process.argv[2]?.replace(/\/$/, '');
if (!url?.startsWith('https://')) throw new Error('Pass the deployed HTTPS origin.');

const repoFile = new URL('../.agentos/credentials.env', import.meta.url);
const current = await readFile(repoFile, 'utf8');
const token = current.match(/^(?:export )?PLEASURE_PIZZA_API_KEY=(.+)$/m)?.[1];
if (!token) throw new Error('The local credential file does not contain a token.');

await writeFile(repoFile, `export AGENTOS_URL=${url}\nexport AGENTOS_MCP_URL=${url}/mcp\nexport PLEASURE_PIZZA_API_KEY=${token}\n`, { mode: 0o600 });
await chmod(repoFile, 0o600);

const userConfigDirectory = `${homedir()}/.config/agentos`;
const userConfigFile = `${userConfigDirectory}/pleasure-pizza.json`;
await mkdir(userConfigDirectory, { recursive: true });
await writeFile(userConfigFile, `${JSON.stringify({ url, mcpUrl: `${url}/mcp`, token }, null, 2)}\n`, { mode: 0o600 });
await chmod(userConfigFile, 0o600);

console.log('Saved the deployed URL without exposing the credential.');
