import SwaggerClient from 'swagger-client';
import { getEnv, maybeEnv } from '../utils/env.js';
import { request } from 'undici';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface OperationSpec {
  path: string;
  method: HttpMethod;
  operationId?: string;
}

const maxPerTag = Number(maybeEnv('OPENAPI_SMOKE_PER_TAG', '2'));
const allowedMethodsEnv = (maybeEnv('OPENAPI_ALLOWED_METHODS', 'GET') || 'GET')
  .split(',')
  .map((m) => m.trim().toLowerCase());

async function selectSmokeOperations(spec: any): Promise<OperationSpec[]> {
  const operations: OperationSpec[] = [];
  const perTagCounter: Record<string, number> = {};
  if (!spec.paths) return operations;

  for (const [path, methods] of Object.entries<any>(spec.paths)) {
    // пропускаем пути с path-параметрами без данных для подстановки
    if (path.includes('{')) continue;
    for (const [method, op] of Object.entries<any>(methods)) {
      const m = method.toLowerCase();
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(m)) continue;
      if (!allowedMethodsEnv.includes(m)) continue;
      if (op?.requestBody?.required) continue;
      const hasRequiredParams = Array.isArray(op?.parameters)
        ? op.parameters.some((p: any) => p?.required === true)
        : false;
      if (hasRequiredParams) continue;
      const tags: string[] = Array.isArray(op.tags) && op.tags.length > 0 ? (op.tags as string[]) : ['_untagged'];
      const tag: string = (tags[0] ?? '_untagged') as string;
      perTagCounter[tag] = perTagCounter[tag] ?? 0;
      if (perTagCounter[tag] >= maxPerTag) continue;
      operations.push({ path, method: m as HttpMethod, operationId: op.operationId });
      perTagCounter[tag]++;
    }
  }
  return operations.slice(0, Number(maybeEnv('OPENAPI_SMOKE_LIMIT', '20')));
}

async function buildUrl(baseUrl: string, path: string): Promise<string> {
  if (baseUrl.endsWith('/') && path.startsWith('/')) return baseUrl + path.slice(1);
  if (!baseUrl.endsWith('/') && !path.startsWith('/')) return baseUrl + '/' + path;
  return baseUrl + path;
}

async function callOperation(baseUrl: string, op: OperationSpec, apiKey?: string): Promise<{ ok: boolean; status: number; url: string }>{
  const url = await buildUrl(baseUrl, op.path);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;

  const res = await request(url, { method: op.method.toUpperCase(), headers });
  const ok = res.statusCode >= 200 && res.statusCode < 300;
  return { ok, status: res.statusCode, url };
}

async function main() {
  const openapiUrl = getEnv('OPENAPI_URL');
  const baseUrl = maybeEnv('BASE_URL');
  const apiKey = maybeEnv('API_TOKEN');

  const client = await SwaggerClient({ url: openapiUrl });
  const spec = client.spec;
  const servers: any[] = Array.isArray(spec.servers) ? spec.servers : [];
  const resolvedBaseUrl = baseUrl ?? (servers[0]?.url as string | undefined);
  if (!resolvedBaseUrl) throw new Error('BASE_URL not provided and not found in OpenAPI servers');

  const ops = await selectSmokeOperations(spec);
  if (ops.length === 0) {
    console.log('No operations selected for smoke.');
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;
  for (const op of ops) {
    try {
      const res = await callOperation(resolvedBaseUrl, op, apiKey);
      const label = op.operationId ? `${op.method.toUpperCase()} ${op.operationId}` : `${op.method.toUpperCase()} ${op.path}`;
      if (res.ok) {
        console.log(`PASS ${label} -> ${res.status} ${res.url}`);
        passed++;
      } else {
        console.error(`FAIL ${label} -> ${res.status} ${res.url}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`ERROR ${op.method.toUpperCase()} ${op.path}:`, err?.message ?? err);
      failed++;
    }
  }

  console.log(`Smoke complete. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}


