import { randomBytes } from 'node:crypto';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

const token = `aos_pp_${randomBytes(32).toString('base64url')}`;
const credentialsDirectory = new URL('../.agentos/', import.meta.url);
const credentialsFile = new URL('credentials.env', credentialsDirectory);

await mkdir(credentialsDirectory, { recursive: true });
await writeFile(credentialsFile, `export AGENTOS_URL=__RAILWAY_URL__\nexport AGENTOS_MCP_URL=__RAILWAY_URL__/mcp\nexport PLEASURE_PIZZA_API_KEY=${token}\n`, { mode: 0o600 });
await chmod(credentialsFile, 0o600);

const userConfigDirectory = `${homedir()}/.config/agentos`;
const userConfigFile = `${userConfigDirectory}/pleasure-pizza.json`;
await mkdir(userConfigDirectory, { recursive: true });
await writeFile(userConfigFile, `${JSON.stringify({ url: '__RAILWAY_URL__', mcpUrl: '__RAILWAY_URL__/mcp', token }, null, 2)}\n`, { mode: 0o600 });
await chmod(userConfigFile, 0o600);

const result = spawnSync('railway', ['variable', 'set', 'AGENTOS_API_KEY', '--stdin', '--service', 'mcp', '--skip-deploys', '--json'], {
  input: token,
  encoding: 'utf8'
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || 'Failed to store the Railway credential.\n');
  process.exit(result.status ?? 1);
}

console.log('Created private local credential files and stored the matching Railway variable.');
