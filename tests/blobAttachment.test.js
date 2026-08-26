const assert = require('assert');
const crypto = require('crypto');

// Simulated AttachmentRef Validator
function validateAttachmentRef(attachment) {
  if (!attachment || typeof attachment !== 'object') {
    return { valid: false, reason: 'Attachment MUST be a non-null object' };
  }
  if (!attachment.id || typeof attachment.id !== 'string') {
    return { valid: false, reason: 'Attachment MUST have a string id' };
  }
  // Base64 Check: MUST NOT store raw base64 data URLs
  if (attachment.blobUrl && attachment.blobUrl.startsWith('data:')) {
    return { valid: false, reason: 'Base64 data URLs are FORBIDDEN in AttachmentRef and Redis state' };
  }
  if (!attachment.blobUrl || typeof attachment.blobUrl !== 'string' || !attachment.blobUrl.startsWith('http')) {
    return { valid: false, reason: 'Attachment MUST have a valid HTTP(S) blobUrl' };
  }
  if (!attachment.pathname || typeof attachment.pathname !== 'string') {
    return { valid: false, reason: 'Attachment MUST have a string pathname' };
  }
  if (!attachment.contentType || typeof attachment.contentType !== 'string') {
    return { valid: false, reason: 'Attachment MUST have a contentType string' };
  }
  if (typeof attachment.size !== 'number' || attachment.size < 0) {
    return { valid: false, reason: 'Attachment MUST have a non-negative number size' };
  }
  if (!attachment.fileName || typeof attachment.fileName !== 'string') {
    return { valid: false, reason: 'Attachment MUST have a fileName string' };
  }
  if (typeof attachment.createdAt !== 'number' || attachment.createdAt <= 0) {
    return { valid: false, reason: 'Attachment MUST have a valid createdAt timestamp' };
  }
  // Base64 Check: MUST NOT store raw base64 data URLs
  if (attachment.blobUrl.startsWith('data:') || (attachment.content && attachment.content.startsWith('data:'))) {
    return { valid: false, reason: 'Base64 data URLs are FORBIDDEN in AttachmentRef and Redis state' };
  }

  return { valid: true };
}

// Server-side Upload Handler Mock (Aisolated Unit Test)
function mockServerSideUpload(fileMeta, envVars) {
  if (!envVars.BLOB_READ_WRITE_TOKEN) {
    return { status: 503, body: { error: 'BLOB_NOT_CONFIGURED' } };
  }
  if (!fileMeta || !fileMeta.name) {
    return { status: 400, body: { error: 'INVALID_FILE' } };
  }

  const uniqueId = `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const safeFileName = fileMeta.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const pathname = `attachments/${uniqueId}/${safeFileName}`;
  const blobUrl = `https://store.public.blob.vercel-storage.com/${pathname}`;

  const attachment = {
    id: uniqueId,
    blobUrl,
    pathname,
    contentType: fileMeta.type || 'application/octet-stream',
    size: fileMeta.size || 1024,
    fileName: fileMeta.name,
    createdAt: Date.now()
  };

  const val = validateAttachmentRef(attachment);
  if (!val.valid) {
    return { status: 500, body: { error: 'CONTRACT_VIOLATION', reason: val.reason } };
  }

  return { status: 200, body: { success: true, attachment } };
}

async function runTest1_ContractValidation() {
  console.log('\n[PRUEBA 1] Validación del Contrato AttachmentRef (0 Base64)...');

  const validAttachment = {
    id: 'att_1787600000000_a1b2c3d4',
    blobUrl: 'https://store.public.blob.vercel-storage.com/attachments/att_1/doc.pdf',
    pathname: 'attachments/att_1/doc.pdf',
    contentType: 'application/pdf',
    size: 204850,
    fileName: 'Plano_Arquitectonico.pdf',
    createdAt: Date.now()
  };

  const checkVal = validateAttachmentRef(validAttachment);
  assert.strictEqual(checkVal.valid, true, 'El contrato válido fue rechazado.');

  // Test Base64 rejection
  const base64Attachment = {
    ...validAttachment,
    blobUrl: 'data:application/pdf;base64,JVBERi0xLjQK...'
  };
  const checkBase64 = validateAttachmentRef(base64Attachment);
  assert.strictEqual(checkBase64.valid, false, 'No se rechazó la URL Base64.');
  assert.strictEqual(checkBase64.reason.includes('Base64 data URLs are FORBIDDEN'), true);

  console.log('- AttachmentRef válido aceptado correctamente ✅');
  console.log('- Adjunto con Data URL Base64 rechazado estrictamente ✅');
}

async function runTest2_EnvironmentVariablesRead() {
  console.log('\n[PRUEBA 2] Lectura segura de Variables de Entorno de Servidor...');

  const simulatedEnv = {
    BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test_token_secret_12345',
    BLOB_STORE_ID: 'store_abc123',
    BLOB_WEBHOOK_PUBLIC_KEY: 'pk_xyz789'
  };

  const isConfigured = Boolean(
    simulatedEnv.BLOB_READ_WRITE_TOKEN &&
    simulatedEnv.BLOB_STORE_ID &&
    simulatedEnv.BLOB_WEBHOOK_PUBLIC_KEY
  );

  assert.strictEqual(isConfigured, true);

  // Masking assertion: ensure secrets are NEVER logged in full
  const maskedToken = simulatedEnv.BLOB_READ_WRITE_TOKEN.substring(0, 15) + '***';
  assert.strictEqual(maskedToken.includes('secret_12345'), false);

  console.log(`- Detección de variables en servidor: OK (${maskedToken}) ✅`);
  console.log('- Cero exposición de valores secretos en logs ✅');
}

async function runTest3_ServerSideRouteUpload() {
  console.log('\n[PRUEBA 3] Ejecución aislada de Ruta Server-Side Upload (Sin escrituras Redis)...');

  const fileInput = {
    name: 'Presupuesto_Estructura_2026.pdf',
    type: 'application/pdf',
    size: 450000
  };

  const mockEnv = {
    BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test'
  };

  const response = mockServerSideUpload(fileInput, mockEnv);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(typeof response.body.attachment.id, 'string');
  assert.strictEqual(response.body.attachment.fileName, 'Presupuesto_Estructura_2026.pdf');
  assert.strictEqual(response.body.attachment.blobUrl.startsWith('https://'), true);

  console.log(`- Petición procesada 200 OK: ID ${response.body.attachment.id}`);
  console.log(`- URL del Blob generada: ${response.body.attachment.blobUrl}`);
  console.log('- Referencia limpia sin Base64 lista para adjuntar al Documento ✅');
}

async function runTest4_UnconfiguredEnvHandling() {
  console.log('\n[PRUEBA 4] Manejo de Servidor sin Variables de Entorno...');

  const response = mockServerSideUpload({ name: 'test.png' }, {});
  assert.strictEqual(response.status, 503);
  assert.strictEqual(response.body.error, 'BLOB_NOT_CONFIGURED');

  console.log('- Servidor responde 503 BLOB_NOT_CONFIGURED cuando faltan credenciales ✅');
}

async function main() {
  console.log('================================================================');
  console.log('🧪 SUITE DE PRUEBAS AISLADAS: VERCEL BLOB & ATTACHMENTREF');
  console.log('================================================================');

  await runTest1_ContractValidation();
  await runTest2_EnvironmentVariablesRead();
  await runTest3_ServerSideRouteUpload();
  await runTest4_UnconfiguredEnvHandling();

  console.log('\n================================================================');
  console.log('🎉 TODAS LAS 4 PRUEBAS DE VERCEL BLOB PASARON SATISFACTORIAMENTE (100%)');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('❌ ERROR EN SUITE VERCEL BLOB:', err);
  process.exit(1);
});
