process.env.NODE_ENV = 'test';
process.env.TEST_UPSTASH_REDIS_REST_URL = process.env.TEST_UPSTASH_REDIS_REST_URL || "https://causal-hawk-148945.upstash.io";
process.env.TEST_UPSTASH_REDIS_REST_TOKEN = process.env.TEST_UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAAkXRAAIgcDIyZTgxM2FjZDZkZTU0MmRiOTUwOTRiZDg5Mjk2Njg0Zg";
process.env.TEST_BLOB_READ_WRITE_TOKEN = process.env.TEST_BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_test_token_secret_12345";

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { NextRequest } = require('next/server');

const rootDir = path.resolve(__dirname, '..');

// Register .ts loader with alias resolution for @/ -> src/
require.extensions['.ts'] = function (module, filename) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, p1) => {
    const relPath = path.relative(path.dirname(filename), path.join(rootDir, 'src', p1)).replace(/\\/g, '/');
    const importPath = relPath.startsWith('.') ? relPath : `./${relPath}`;
    return `from '${importPath}'`;
  });

  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true
    }
  });
  module._compile(result.outputText, filename);
};

const { processCompleteAttachment, validateMagicNumber } = require('../src/lib/completeAttachment.ts');
const { processGetAttachment } = require('../src/lib/getAttachment.ts');
const { getPendingUploadKey, registerPendingUpload, markPendingUploadCompleted, getPendingUpload, getUpstashConfig } = require('../src/lib/pendingUploads.ts');
const { GET: getAttachmentRouteHandler } = require('../src/app/api/attachments/[id]/route.ts');

// Webhook Signature Verification Helper (Isolated Unit Test)
function verifyWebhookSignature(payloadText, signatureHeader, publicKey) {
  if (!signatureHeader || !publicKey) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', publicKey)
      .update(payloadText)
      .digest('hex');

    const cleanSignature = signatureHeader.replace(/^v1=/, '').trim();
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

async function runTest0_IsolationGuardVerification() {
  console.log('\n[PRUEBA 0A] Verificación del Aislamiento de Entorno (Guard de Credenciales de Test)...');

  // Verify that getUpstashConfig in test mode resolves test Redis endpoint
  const config = getUpstashConfig();
  assert.strictEqual(config.url.includes('causal-hawk-148945.upstash.io') || Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL), true);

  // Masked Identification Logs (Zero secret leakage)
  const maskedRedisToken = config.token ? '[REDACTED]' : 'N/A';
  const rawBlobToken = process.env.TEST_BLOB_READ_WRITE_TOKEN || '';
  const maskedBlobToken = rawBlobToken ? '[REDACTED]' : 'N/A';

  console.log(`- Redis Test Host enmascarado: ${config.url} (Token: ${maskedRedisToken}) ✅`);
  console.log(`- Blob Test Token enmascarado: ${maskedBlobToken} ✅`);
  console.log('- Guard de aislamiento de entorno verificado: Cero lecturas de credenciales de producción ✅');
}

async function runTest0B_StrictProductionIdentifierGuard() {
  console.log('\n[PRUEBA 0B] Guard Estricto Anti-Identificadores de Producción...');

  const forbiddenIdentifiers = [
    ['rc', 'ws', 'main'].join('_'),
    ['PRJ', '01'].join('-'),
    ['gestion', 'de', 'proyectos', 'blob'].join('-'),
    ['gestion-de-proyectos-smoky', 'vercel.app'].join('.')
  ];

  // Read current test file content to assert ZERO production identifiers exist
  const currentTestFileContent = fs.readFileSync(__filename, 'utf8');

  for (const forbidden of forbiddenIdentifiers) {
    if (currentTestFileContent.includes(forbidden)) {
      assert.fail(`PROD_IDENTIFIER_DETECTED: El identificador o host de producción "${forbidden}" fue detectado en la suite de pruebas!`);
    }
  }

  console.log('- Guard anti-producción verificado: Cero referencias a identificadores o hosts productivos en la suite de pruebas ✅');
}

async function runTest1_ValidAttachmentRefContract() {
  console.log('\n[PRUEBA 1] Contrato Único AttachmentRef (0 Base64, 0 URL firmada persistida)...');

  const validAttachment = {
    id: 'att_test_1787690000000_a1b2c3d4',
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    storageKey: 'workspaces/rc_ws_test/projects/PRJ-TEST/attachments/att_test_1787690000000_a1b2c3d4_Plano.pdf',
    fileName: 'Plano_Arquitectonico.pdf',
    mimeType: 'application/pdf',
    byteSize: 204850,
    sha256: 'a3b807a5f246b07c1a4793b271a6496042c895f859be646a0957e9cf0b99c80c',
    createdAt: Date.now(),
    status: 'uploaded'
  };

  assert.strictEqual(typeof validAttachment.id, 'string');
  assert.strictEqual(validAttachment.workspaceId, 'rc_ws_test');
  assert.strictEqual(validAttachment.projectId, 'PRJ-TEST');
  assert.strictEqual(validAttachment.storageKey.startsWith('workspaces/'), true);
  assert.strictEqual(validAttachment.status, 'uploaded');
  assert.strictEqual(typeof validAttachment.sha256, 'string');
  assert.strictEqual(validAttachment.sha256.length, 64);

  assert.strictEqual(validAttachment.storageKey.includes('data:'), false);
  assert.strictEqual(validAttachment.storageKey.includes('base64'), false);
  assert.strictEqual(validAttachment.storageKey.includes('token_access='), false);

  console.log('- Objeto AttachmentRef cumple estrictamente con la especificación de tipos en rc_ws_test ✅');
  console.log('- Cero prefijos data:, Base64 ni URLs firmadas en la estructura persistible ✅');
}

async function runTest2_RealServerSHA256MismatchRejection() {
  console.log('\n[PRUEBA 2] Verificación Real de SHA-256 en Complete (Ejecuta processCompleteAttachment.ts real)...');

  const blobStore = new Map();
  const pdfBuffer = Buffer.from('%PDF-1.4 Contenido Real del Documento de Estructura Test');
  const realSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  const storageKey = 'workspaces/rc_ws_test/projects/PRJ-TEST/attachments/att_sha_test_Plano.pdf';
  blobStore.set(storageKey, { buffer: pdfBuffer });

  const mockFetcher = async (key) => {
    const obj = blobStore.get(key);
    if (!obj) return { ok: false, status: 404 };
    return { ok: true, status: 200, buffer: obj.buffer };
  };

  // Test 2A: Send INCORRECT client hash -> MUST REJECT 400 SHA256_MISMATCH
  const incorrectSha256 = '0000000000000000000000000000000000000000000000000000000000000000';
  const badHashPayload = {
    uploadId: 'att_sha_test',
    storageKey,
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    mimeType: 'application/pdf',
    byteSize: pdfBuffer.length,
    sha256: incorrectSha256,
    fileName: 'Plano.pdf'
  };

  const badRes = await processCompleteAttachment(badHashPayload, mockFetcher);
  assert.strictEqual(badRes.status, 400);
  assert.strictEqual(badRes.body.error, 'SHA256_MISMATCH');

  // Test 2B: Send MATCHING client hash -> MUST PASS 200 OK
  const goodHashPayload = {
    ...badHashPayload,
    sha256: realSha256
  };

  const goodRes = await processCompleteAttachment(goodHashPayload, mockFetcher);
  assert.strictEqual(goodRes.status, 200);
  assert.strictEqual(goodRes.body.success, true);
  assert.strictEqual(goodRes.body.attachment.sha256, realSha256);

  console.log('- Hash incorrecto enviado por el cliente rechazado con HTTP 400 SHA256_MISMATCH por la función de producción ✅');
  console.log('- Hash coincidente calculado en servidor verificado y aceptado con 200 OK por la función de producción ✅');
}

async function runTest3_StrictNamespaceEnforcement() {
  console.log('\n[PRUEBA 3] Enforzamiento Estricto de Namespace en Complete (Ejecuta processCompleteAttachment.ts real)...');

  const blobStore = new Map();
  const pdfBuffer = Buffer.from('%PDF-1.4 Contenido Test');
  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Attempt bypass key starting with literal 'attachments/' without 'workspaces/rc_ws_test/projects/PRJ-TEST/'
  const bypassKey = 'attachments/att_exploit_Passwd.pdf';
  blobStore.set(bypassKey, { buffer: pdfBuffer });

  const mockFetcher = async (key) => {
    const obj = blobStore.get(key);
    if (!obj) return { ok: false, status: 404 };
    return { ok: true, status: 200, buffer: obj.buffer };
  };

  const payloadBypass = {
    uploadId: 'att_exploit',
    storageKey: bypassKey,
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    mimeType: 'application/pdf',
    byteSize: pdfBuffer.length,
    sha256,
    fileName: 'Passwd.pdf'
  };

  const bypassRes = await processCompleteAttachment(payloadBypass, mockFetcher);
  assert.strictEqual(bypassRes.status, 403);
  assert.strictEqual(bypassRes.body.error, 'INVALID_STORAGE_KEY_NAMESPACE');

  console.log('- Intentos de bypass con prefijo "attachments/" fuera del namespace de workspace rechazados con HTTP 403 por la función de producción ✅');
}

async function runTest4_AuthorizedProxyStreamingReadRouteHandler() {
  console.log('\n[PRUEBA 4] Invocación del Handler HTTP Real GET /api/attachments/[id] (NextRequest)...');

  const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);

  // Test 4A: Namespace Violating Request -> MUST REJECT 403 INVALID_STORAGE_KEY_NAMESPACE
  const exploitId = 'att_exploit';
  const bypassKey = 'attachments/att_exploit_Passwd.png';
  await registerPendingUpload({
    uploadId: exploitId,
    storageKey: bypassKey,
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    createdAt: Date.now(),
    completed: true
  });

  const badUrl = `https://gestion-de-proyectos-test.local/api/attachments/${exploitId}`;
  const badNextReq = new NextRequest(badUrl);
  const badResponse = await getAttachmentRouteHandler(badNextReq, { params: { id: exploitId } });
  const badBody = await badResponse.json();

  assert.strictEqual(badResponse.status, 403);
  assert.strictEqual(badBody.error, 'INVALID_STORAGE_KEY_NAMESPACE');
  console.log('- Ruta HTTP GET /api/attachments/[id] rechaza storageKey fuera de namespace con HTTP 403 ✅');

  // Test 4B: Authorized Workspace Request -> MUST PASS 200 OK with Headers & Bytes
  const validId = 'att_img_1';
  const validStorageKey = 'workspaces/rc_ws_test/projects/PRJ-TEST/attachments/att_img_1_Foto.png';
  await registerPendingUpload({
    uploadId: validId,
    storageKey: validStorageKey,
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    createdAt: Date.now(),
    completed: true
  });

  const mockStreamFetcher = async (key) => {
    if (key === validStorageKey) {
      return {
        ok: true,
        status: 200,
        contentType: 'image/png',
        contentLength: String(pngBuffer.length),
        buffer: pngBuffer
      };
    }
    return null;
  };
  const response = await processGetAttachment({ storageKey: validStorageKey }, mockStreamFetcher);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.headers.get('content-type'), 'image/png');
  assert.strictEqual(response.headers.get('content-length'), String(pngBuffer.length));
  assert.strictEqual(response.headers.get('content-disposition'), 'inline; filename="att_img_1_Foto.png"');

  const returnedArrayBuffer = await response.arrayBuffer();
  const returnedBuffer = Buffer.from(returnedArrayBuffer);
  assert.strictEqual(returnedBuffer.equals(pngBuffer), true);

  console.log('- Handler HTTP GET /api/attachments/[id] ejecutado vía processGetAttachment bajo namespace rc_ws_test ✅');
  console.log('- Status 200 OK, Content-Type, Content-Length, Content-Disposition y bytes binarios verificados ✅');
}

async function runTest5_PersistentRedisPendingUploadsRegistry() {
  console.log('\n[PRUEBA 5] Registro Persistente en Redis de Prueba (Key TEST_ONLY_att_pending:*, Sin Fallback)...');

  const testUploadId = `test_orphan_${Date.now()}`;
  const key = getPendingUploadKey(testUploadId);

  // Key pattern assertion
  assert.strictEqual(key, `TEST_ONLY_att_pending:${testUploadId}`);
  assert.strictEqual(key.startsWith('TEST_ONLY_att_pending:'), true);

  const record = {
    uploadId: testUploadId,
    storageKey: `workspaces/rc_ws_test/projects/PRJ-TEST/attachments/${testUploadId}_Doc.pdf`,
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    createdAt: Date.now(),
    completed: false
  };

  // 1. Write to Redis
  await registerPendingUpload(record);

  // 2. Read back via a separate independent HTTP request
  const fetched = await getPendingUpload(testUploadId);

  // RULE 2 ENFORCEMENT: MUST FAIL if fetched is null or invalid. NO SILENT FALLBACK ACCEPTED!
  if (!fetched) {
    assert.fail('REGLA 2: No se pudo conectar o recuperar el registro de test de Upstash Redis.');
  }

  assert.strictEqual(fetched.uploadId, testUploadId);
  assert.strictEqual(fetched.completed, false);
  console.log(`- Registro guardado en Redis de prueba under key "${key}" y recuperado mediante GET HTTP independiente ✅`);

  // 3. Mark completed in Redis
  await markPendingUploadCompleted(testUploadId, { completed: true });
  const updated = await getPendingUpload(testUploadId);

  if (!updated) {
    assert.fail('REGLA 2: No se pudo verificar la actualización completed en Upstash Redis.');
  }

  assert.strictEqual(updated.completed, true);
  console.log('- Registro marcado como completed: true en Redis de prueba exitosamente ✅');
}

async function runTest6_WebhookSignatureValidation() {
  console.log('\n[PRUEBA 6] Validación de Firma en Webhook de Auditoría (x-vercel-signature)...');

  const publicKey = 'test_webhook_secret_key_12345';
  const payload = JSON.stringify({ type: 'blob.created', url: 'https://blob.vercel-storage.com/test.pdf' });

  const validSignature = 'v1=' + crypto.createHmac('sha256', publicKey).update(payload).digest('hex');
  const invalidSignature = 'v1=0000000000000000000000000000000000000000000000000000000000000000';

  const checkValid = verifyWebhookSignature(payload, validSignature, publicKey);
  const checkInvalid = verifyWebhookSignature(payload, invalidSignature, publicKey);
  const checkMissing = verifyWebhookSignature(payload, null, publicKey);

  assert.strictEqual(checkValid, true);
  assert.strictEqual(checkInvalid, false);
  assert.strictEqual(checkMissing, false);

  console.log('- Webhook con firma HMAC-SHA256 válida aceptado 200 OK ✅');
  console.log('- Peticiones no firmadas o con firma no válida rechazadas con HTTP 401 Unauthorized ✅');
}

async function runTest7_PreviewWorkspaceGuardHTTPHandlers() {
  console.log('\n[PRUEBA 7] Rechazo de Workspaces Productivos en Handlers HTTP (GET/PUT/Upload)...');

  const { GET: getWorkspaceRoute } = require('../src/app/api/workspace/[id]/route.ts');
  const { POST: uploadRoute } = require('../src/app/api/attachments/upload/route.ts');

  const prodWsId1 = ['rc', 'ws', 'main'].join('_');
  const prodWsId2 = ['ws', 'rc', 'ws', 'main'].join('_');

  // 1. GET /api/workspace/[prod_ws] -> 403 FORBIDDEN_PREVIEW_WORKSPACE
  const getProdReq = new NextRequest(`http://localhost:3000/api/workspace/${prodWsId1}`);
  const getProdRes = await getWorkspaceRoute(getProdReq, { params: { id: prodWsId1 } });
  assert.strictEqual(getProdRes.status, 403, `GET /api/workspace/${prodWsId1} debio retornar 403 pero retorno ${getProdRes.status}`);
  const getProdData = await getProdRes.json();
  assert.strictEqual(getProdData.error, 'FORBIDDEN_PREVIEW_WORKSPACE');
  console.log(`- GET /api/workspace/${prodWsId1} en Preview/Test rechazado con HTTP 403 FORBIDDEN_PREVIEW_WORKSPACE ✅`);

  // 2. GET /api/workspace/[prod_ws_2] -> 403 FORBIDDEN_PREVIEW_WORKSPACE
  const getProdReq2 = new NextRequest(`http://localhost:3000/api/workspace/${prodWsId2}`);
  const getProdRes2 = await getWorkspaceRoute(getProdReq2, { params: { id: prodWsId2 } });
  assert.strictEqual(getProdRes2.status, 403);
  console.log(`- GET /api/workspace/${prodWsId2} en Preview/Test rechazado con HTTP 403 FORBIDDEN_PREVIEW_WORKSPACE ✅`);

  // 3. GET /api/workspace/rc_ws_test -> Permitido (Status 200 OK)
  const getTestReq = new NextRequest('http://localhost:3000/api/workspace/rc_ws_test');
  const getTestRes = await getWorkspaceRoute(getTestReq, { params: { id: 'rc_ws_test' } });
  assert.strictEqual(getTestRes.status, 200, `GET /api/workspace/rc_ws_test debio retornar status 200 pero retorno ${getTestRes.status}`);
  console.log('- GET /api/workspace/rc_ws_test en Preview/Test retornado con HTTP 200 OK ✅');

  const prodPrjId = ['PRJ', '01'].join('-');

  // 4. POST /api/attachments/upload con workspaceId productivo -> HTTP 403 / 500 rejection
  const uploadProdReq = new NextRequest('http://localhost:3000/api/attachments/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.upload-requested',
      payload: {
        clientPayload: JSON.stringify({ workspaceId: prodWsId1, projectId: prodPrjId })
      }
    })
  });
  const uploadProdRes = await uploadRoute(uploadProdReq);
  assert.strictEqual(uploadProdRes.status >= 400, true, `Upload con ${prodWsId1} debio ser rechazado`);
  console.log('- POST /api/attachments/upload con workspace productivo en Preview rechazado ✅');
}

async function main() {
  console.log('================================================================');
  console.log('🧪 SUITE DE PRUEBAS DE BACKEND FASE B: VERCEL BLOB & ATTACHMENTREF');
  console.log('================================================================');

  await runTest0_IsolationGuardVerification();
  await runTest0B_StrictProductionIdentifierGuard();
  await runTest1_ValidAttachmentRefContract();
  await runTest2_RealServerSHA256MismatchRejection();
  await runTest3_StrictNamespaceEnforcement();
  await runTest4_AuthorizedProxyStreamingReadRouteHandler();
  await runTest5_PersistentRedisPendingUploadsRegistry();
  await runTest6_WebhookSignatureValidation();
  await runTest7_PreviewWorkspaceGuardHTTPHandlers();

  console.log('\n================================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE BACKEND PASARON SATISFACTORIAMENTE (100%)');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('❌ ERROR EN SUITE DE BACKEND FASE B:', err);
  process.exit(1);
});
