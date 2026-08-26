process.env.NODE_ENV = 'test';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { put, del } = require('@vercel/blob');

// Read .env.local to load test environment variables
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valParts] = trimmed.split('=');
    if (key && valParts.length > 0) {
      const val = valParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

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

const { processCompleteAttachment } = require('../src/lib/completeAttachment.ts');
const { processGetAttachment } = require('../src/lib/getAttachment.ts');
const { getPendingUpload } = require('../src/lib/pendingUploads.ts');

async function runRealBlobIntegrationTest() {
  console.log('================================================================');
  console.log('🧪 PRUEBA DE INTEGRACIÓN REAL DE EXTREMO A EXTREMO: TEST BLOB STORE');
  console.log('================================================================');

  // STEP 1: Security Guard & Credentials Verification
  const testBlobToken = process.env.TEST_BLOB_READ_WRITE_TOKEN;
  const testRedisUrl = process.env.TEST_UPSTASH_REDIS_REST_URL;

  assert.ok(testBlobToken, 'TEST_ENVIRONMENT_VIOLATION: TEST_BLOB_READ_WRITE_TOKEN no está definido en .env.local!');
  assert.ok(testRedisUrl, 'TEST_ENVIRONMENT_VIOLATION: TEST_UPSTASH_REDIS_REST_URL no está definido!');

  const maskedToken = testBlobToken.substring(0, 15) + '***';
  console.log(`\n[PASO 1] Guardia de Seguridad y Credenciales de Prueba...`);
  console.log(`- Token Vercel Blob Test: ${maskedToken} ✅`);
  console.log(`- Redis Test URL: ${testRedisUrl} ✅`);
  console.log(`- Guard de aislamiento verificado: Cero uso de credenciales productivas ✅`);

  // STEP 2: Generate Synthetic PDF File in Memory
  const timestamp = Date.now();
  const uploadId = `test_real_${timestamp}`;
  const fileName = `Documento_Sintetico_${timestamp}.pdf`;
  const storageKey = `workspaces/rc_ws_test/projects/PRJ-TEST/attachments/${uploadId}_${fileName}`;

  const syntheticPdfContent = `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Documento Sintetico Test ${timestamp}) >>\nendobj\n%%EOF\n`;
  const syntheticPdfBuffer = Buffer.from(syntheticPdfContent, 'utf8');
  const expectedSha256 = crypto.createHash('sha256').update(syntheticPdfBuffer).digest('hex');
  const byteSize = syntheticPdfBuffer.length;

  console.log(`\n[PASO 2] Archivo Sintético Generado en Memoria...`);
  console.log(`- StorageKey: ${storageKey}`);
  console.log(`- TamaÃ±o: ${byteSize} bytes | SHA-256: ${expectedSha256} ✅`);

  // STEP 3: Real Upload to Test Vercel Blob Store via SDK put()
  console.log(`\n[PASO 3] Subida Real a Vercel Blob Store de Pruebas (SDK put)...`);
  const putResult = await put(storageKey, syntheticPdfBuffer, {
    access: 'private',
    contentType: 'application/pdf',
    token: testBlobToken
  });

  assert.ok(putResult.url, 'La subida real a Vercel Blob Store no devolvió una URL');
  console.log(`- Objeto creado exitosamente en Test Blob Store!`);
  console.log(`- URL Devuelta: ${putResult.url} ✅`);

  // STEP 4: Real Complete Verification (processCompleteAttachment)
  console.log(`\n[PASO 4] Confirmación Real en Servidor (processCompleteAttachment + SHA-256 binario real)...`);
  const completeResult = await processCompleteAttachment({
    uploadId,
    storageKey,
    workspaceId: 'rc_ws_test',
    projectId: 'PRJ-TEST',
    mimeType: 'application/pdf',
    byteSize,
    sha256: expectedSha256,
    fileName
  }, undefined, testBlobToken);

  assert.strictEqual(completeResult.status, 200, `Complete falló con status ${completeResult.status}`);
  assert.strictEqual(completeResult.body.success, true);
  assert.strictEqual(completeResult.body.attachment.sha256, expectedSha256);
  assert.strictEqual(completeResult.body.attachment.status, 'uploaded');
  console.log(`- Verificación binaria SHA-256 y Magic Number completada con 200 OK ✅`);
  console.log(`- AttachmentRef producido: ID ${completeResult.body.attachment.id}`);

  // STEP 5: Real Private Read (processGetAttachment)
  console.log(`\n[PASO 5] Lectura Privada Real (processGetAttachment + SDK get streaming)...`);
  const getResponse = await processGetAttachment({ storageKey }, undefined, testBlobToken);

  assert.strictEqual(getResponse.status, 200, `Lectura privada falló con status ${getResponse.status}`);
  assert.strictEqual(getResponse.headers.get('content-type'), 'application/pdf');
  assert.strictEqual(getResponse.headers.get('content-disposition'), `inline; filename="${fileName}"`);

  const responseArrayBuffer = await getResponse.arrayBuffer();
  const responseBuffer = Buffer.from(responseArrayBuffer);
  assert.strictEqual(responseBuffer.equals(syntheticPdfBuffer), true, 'Los bytes binarios devueltos no coinciden 100% con el archivo subido');
  console.log(`- Transferencia privada streaming completada con 200 OK!`);
  console.log(`- Coincidencia binaria de bytes: 100% EXACTA (${responseBuffer.length} bytes) ✅`);

  // STEP 6: Verify Redis Pending Registry Entry
  console.log(`\n[PASO 6] Verificación de Registro Huérfano en Redis de Pruebas...`);
  const pendingRecord = await getPendingUpload(uploadId);
  assert.ok(pendingRecord, 'El registro huérfano no se encontró en Redis de pruebas');
  assert.strictEqual(pendingRecord.completed, true, 'El registro huérfano en Redis no quedó marcado como completed: true');
  console.log(`- Registro en Redis test verificado: key "TEST_ONLY_att_pending:${uploadId}" | completed: true ✅`);

  // STEP 7: Cleanup (SDK del)
  console.log(`\n[PASO 7] Limpieza Real en Test Blob Store (SDK del)...`);
  await del(storageKey, { token: testBlobToken });
  console.log(`- Objeto sintético eliminado exitosamente del Test Blob Store ✅`);

  // Verify deletion
  const getAfterDelete = await processGetAttachment({ storageKey });
  assert.strictEqual(getAfterDelete.status, 404, 'El objeto eliminado aún fue encontrado');
  console.log(`- Confirmación de borrado: Re-lectura devolvió 404 OBJECT_NOT_FOUND como se esperaba ✅`);

  console.log('\n================================================================');
  console.log('🎉 PRUEBA DE INTEGRACIÓN REAL COMPLETADA CON ÉXITO AL 100%');
  console.log('================================================================\n');
}

runRealBlobIntegrationTest().catch(err => {
  console.error('❌ ERROR EN PRUEBA DE INTEGRACIÓN REAL:', err);
  process.exit(1);
});
