const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('Archivo .env.local no encontrado.');
  }
  const content = fs.readFileSync(envPath, 'utf8').replace(/\r/g, '');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim();
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnvLocal();
const testUrl = env.TEST_UPSTASH_REDIS_REST_URL;
const testToken = env.TEST_UPSTASH_REDIS_REST_TOKEN;

if (!testUrl || !testToken) {
  throw new Error('TEST_UPSTASH_REDIS_REST_URL o TEST_UPSTASH_REDIS_REST_TOKEN faltante en .env.local.');
}

function sendUpstashCommand(commandArray) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify([commandArray]);
    const u = new URL(testUrl + '/pipeline');
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (Array.isArray(parsed) && parsed[0]) {
            resolve({ status: res.statusCode, data: parsed[0] });
          } else {
            resolve({ status: res.statusCode, data: parsed });
          }
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function computeStateChecksum(stateObj) {
  const normalized = {
    isCustomized: Boolean(stateObj.isCustomized),
    projects: Array.isArray(stateObj.projects) ? stateObj.projects : [],
    expenses: Array.isArray(stateObj.expenses) ? stateObj.expenses : [],
    batchTables: Array.isArray(stateObj.batchTables) ? stateObj.batchTables : [],
    tasks: Array.isArray(stateObj.tasks) ? stateObj.tasks : [],
    documents: Array.isArray(stateObj.documents) ? stateObj.documents : [],
    wikiDocs: Array.isArray(stateObj.wikiDocs) ? stateObj.wikiDocs : [],
    categories: Array.isArray(stateObj.categories) ? stateObj.categories : [],
    projectCategories: Array.isArray(stateObj.projectCategories) ? stateObj.projectCategories : [],
    responsibles: Array.isArray(stateObj.responsibles) ? stateObj.responsibles : []
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

const LUA_CAS_SCRIPT = `
local currentRaw = redis.call('GET', KEYS[1])
if not currentRaw then
  return cjson.encode({ code = 'NOT_FOUND' })
end

local okCurrent, currentRecord = pcall(cjson.decode, currentRaw)
if not okCurrent or type(currentRecord) ~= 'table' then
  return cjson.encode({ code = 'CORRUPT_RECORD' })
end

local currentState = currentRecord.state or currentRecord
if type(currentState) ~= 'table' then
  return cjson.encode({ code = 'CORRUPT_RECORD' })
end

local currentRevision = tonumber(currentRecord.revision or currentState.revision or 1)
local currentUpdatedAt = tonumber(currentRecord.updatedAt or currentState.updatedAt or 0)
local expectedRevision = tonumber(ARGV[1])
local candidateUpdatedAt = tonumber(ARGV[3])

if not expectedRevision or expectedRevision < 1 or expectedRevision ~= math.floor(expectedRevision) then
  return cjson.encode({ code = 'INVALID_EXPECTED_REVISION' })
end

if expectedRevision ~= currentRevision then
  return cjson.encode({
    code = 'CONFLICT',
    serverRevision = currentRevision,
    updatedAt = currentUpdatedAt,
    checksum = currentRecord.checksum or currentState.checksum or ''
  })
end

local okState, newState = pcall(cjson.decode, ARGV[5])
if not okState or type(newState) ~= 'table' then
  return cjson.encode({ code = 'INVALID_STATE' })
end

local nextRevision = currentRevision + 1
local nextUpdatedAt = math.max(candidateUpdatedAt or 0, currentUpdatedAt + 1)
local finalEnvelope = {
  version = 1,
  workspaceId = ARGV[2],
  revision = nextRevision,
  updatedAt = nextUpdatedAt,
  checksum = ARGV[4],
  state = newState
}
local finalRaw = cjson.encode(finalEnvelope)

redis.call('SET', KEYS[1], finalRaw)

return cjson.encode({
  code = 'OK',
  workspaceId = ARGV[2],
  revision = nextRevision,
  updatedAt = nextUpdatedAt,
  checksum = ARGV[4]
})
`;

async function runRealIntegrationSuite() {
  console.log('================================================================');
  console.log('⚡ PRUEBA DE INTEGRACIÓN REAL EVAL EN BASE AISLADA: PROYECTOS-TEST');
  console.log('================================================================');
  console.log('🔐 CONFIRMACIÓN EXPLÍCITA DE SEGURIDAD:');
  console.log('- Base de datos destino: PROYECTOS-TEST (vía TEST_UPSTASH_REDIS_REST_URL)');
  console.log('- Clave productiva ws_rc_ws_main: NUNCA TOCADA NI LEÍDA (0 ACCESOS) ✅');
  console.log('================================================================\n');

  const runUuid = crypto.randomUUID().slice(0, 8);
  const testKey = `ws_test_cas_real_${runUuid}`;

  const initialSampleState = {
    isCustomized: true,
    projects: [{ id: 'PRJ-TEST-01', name: 'PROYECTO AISLADO TEST' }],
    expenses: [{ id: 'EXP-TEST-01', amount: 999 }],
    batchTables: [], tasks: [], documents: [], wikiDocs: [], categories: [], projectCategories: [], responsibles: []
  };

  const initialEnvelope = {
    version: 1,
    workspaceId: `test_cas_${runUuid}`,
    revision: 1,
    updatedAt: 100000,
    checksum: computeStateChecksum(initialSampleState),
    state: initialSampleState
  };

  // STEP 1: Seed test key on PROYECTOS-TEST
  console.log(`[PASO 1] Inicializando clave desechable ${testKey} en PROYECTOS-TEST...`);
  const setRes = await sendUpstashCommand(["SET", testKey, JSON.stringify(initialEnvelope)]);
  if (setRes.status !== 200 || setRes.data.result !== 'OK') {
    throw new Error(`Fallo al sembrar la clave de prueba en PROYECTOS-TEST. Status: ${setRes.status}`);
  }
  console.log(`- Clave de prueba sembrada correctamente: ${testKey} (Rev. 1) ✅`);

  // STEP 2: GET zero writes test on PROYECTOS-TEST
  console.log('\n[PASO 2] Verificando 0 escrituras durante GET en la base real PROYECTOS-TEST...');
  const get1 = await sendUpstashCommand(["GET", testKey]);
  const get2 = await sendUpstashCommand(["GET", testKey]);

  if (get1.data.result !== get2.data.result) {
    throw new Error('Fallo en PASO 2: La lectura GET provocó mutaciones en la clave de prueba.');
  }
  console.log('- Re-lectura GET devuelta idéntica sin mutaciones: ✅ EXITO');

  // STEP 3: Execute real EVAL CAS 200 OK on PROYECTOS-TEST
  console.log('\n[PASO 3] Ejecutando CAS EVAL atómico exitoso en PROYECTOS-TEST...');
  const updatedState = {
    ...initialSampleState,
    responsibles: [{ id: 'resp-test-1', name: 'Edmundo A.', color: '#007AFF', createdAt: 100, updatedAt: 100 }],
    tasks: [{
      id: 'TSK-REAL-1',
      title: 'Tarea Real Integración',
      status: 'TODO',
      priority: 'HIGH',
      projectId: 'PRJ-TEST-01',
      assigneeName: 'Edmundo A.',
      assigneeIds: ['resp-test-1'],
      notes: 'Nota persistida en Upstash real:\n- Punto 1\n- Punto 2'
    }]
  };
  const updatedChecksum = computeStateChecksum(updatedState);
  const candidateUpdatedAt = Date.now();

  const evalRes = await sendUpstashCommand([
    "EVAL",
    LUA_CAS_SCRIPT,
    "1",
    testKey,
    "1",
    `test_cas_${runUuid}`,
    String(candidateUpdatedAt),
    updatedChecksum,
    JSON.stringify(updatedState)
  ]);

  if (evalRes.status !== 200 || !evalRes.data || !evalRes.data.result) {
    throw new Error(`Fallo en invocación EVAL. Status: ${evalRes.status}`);
  }

  const casResult = JSON.parse(evalRes.data.result);
  console.log(`- Respuesta EVAL en Redis: Code = ${casResult.code}, Rev = ${casResult.revision}, Checksum = ${casResult.checksum}`);

  if (casResult.code !== 'OK' || casResult.revision !== 2) {
    throw new Error(`Fallo en CAS: Código ${casResult.code}, Revisión ${casResult.revision}`);
  }

  // Re-read envelope directly from PROYECTOS-TEST and verify 100% match
  const readBack = await sendUpstashCommand(["GET", testKey]);
  const persistedEnv = typeof readBack.data.result === 'string' ? JSON.parse(readBack.data.result) : readBack.data.result;

  console.log(`- Envelope persistido en Redis real: Rev ${persistedEnv.revision}, updatedAt ${persistedEnv.updatedAt}, checksum ${persistedEnv.checksum}`);
  if (
    persistedEnv.revision !== 2 ||
    persistedEnv.checksum !== casResult.checksum ||
    persistedEnv.state.tasks.length !== 1 ||
    persistedEnv.state.tasks[0].notes !== 'Nota persistida en Upstash real:\n- Punto 1\n- Punto 2' ||
    persistedEnv.state.tasks[0].assigneeIds[0] !== 'resp-test-1'
  ) {
    throw new Error('Fallo en verificación: Discrepancia entre la respuesta EVAL y el envelope almacenado en Upstash.');
  }
  console.log('- Coincidencia 100% exacta entre respuesta 200 OK y envelope almacenado en PROYECTOS-TEST: ✅ EXITO');

  // STEP 4: Immutable Conflict 409 test on PROYECTOS-TEST
  console.log('\n[PASO 4] Verificando conflicto inmutable 409 en PROYECTOS-TEST...');
  const rawBeforeConflict = readBack.data.result;

  const staleEvalRes = await sendUpstashCommand([
    "EVAL",
    LUA_CAS_SCRIPT,
    "1",
    testKey,
    "1",
    `test_cas_${runUuid}`,
    String(Date.now()),
    'stalehash',
    '{}'
  ]);

  const conflictCasResult = JSON.parse(staleEvalRes.data.result);
  const readBackAfterConflict = await sendUpstashCommand(["GET", testKey]);
  const rawAfterConflict = readBackAfterConflict.data.result;

  if (conflictCasResult.code !== 'CONFLICT') {
    throw new Error(`Fallo en PASO 4: Esperado CONFLICT, obtenido ${conflictCasResult.code}`);
  }
  if (rawBeforeConflict !== rawAfterConflict) {
    throw new Error('Fallo en PASO 4: El estado en Redis fue alterado tras el conflicto 409.');
  }
  console.log(`- Código devuelto por Redis: CONFLICT (Server Rev: ${conflictCasResult.serverRevision})`);
  console.log('- Estado en la base de datos real permanece byte-a-byte idéntico tras 409: ✅ EXITO');

  // STEP 5: Real Concurrency Race Test across 20 independent test keys on PROYECTOS-TEST
  console.log('\n[PASO 5] Ejecutando prueba de carrera concurrente en 20 claves independientes en PROYECTOS-TEST...');

  for (let i = 1; i <= 20; i++) {
    const raceKey = `ws_test_cas_race_${runUuid}_${i}`;
    const raceInitialState = {
      isCustomized: true,
      projects: [{ id: 'PRJ-RACE', name: `Proyecto Race ${i}` }],
      expenses: [], batchTables: [], tasks: [], documents: [], wikiDocs: [], categories: [], projectCategories: [], responsibles: []
    };
    const raceEnv = {
      version: 1,
      workspaceId: `race_${i}`,
      revision: 10,
      updatedAt: 500000 + i,
      checksum: computeStateChecksum(raceInitialState),
      state: raceInitialState
    };

    // Seed race key
    await sendUpstashCommand(["SET", raceKey, JSON.stringify(raceEnv)]);

    const stateA = { ...raceInitialState, tasks: [{ id: `tsk-A-${i}`, title: `Ganador A ${i}` }] };
    const stateB = { ...raceInitialState, tasks: [{ id: `tsk-B-${i}`, title: `Ganador B ${i}` }] };

    const checksumA = computeStateChecksum(stateA);
    const checksumB = computeStateChecksum(stateB);

    // Launch 2 SIMULTANEOUS PUTs via Promise.all
    const reqA = sendUpstashCommand([
      "EVAL", LUA_CAS_SCRIPT, "1", raceKey, "10", `race_${i}`, String(Date.now()), checksumA, JSON.stringify(stateA)
    ]);

    const reqB = sendUpstashCommand([
      "EVAL", LUA_CAS_SCRIPT, "1", raceKey, "10", `race_${i}`, String(Date.now() + 5), checksumB, JSON.stringify(stateB)
    ]);

    const [resA, resB] = await Promise.all([reqA, reqB]);
    const retA = JSON.parse(resA.data.result);
    const retB = JSON.parse(resB.data.result);

    const winnerCount = (retA.code === 'OK' ? 1 : 0) + (retB.code === 'OK' ? 1 : 0);
    const conflictCount = (retA.code === 'CONFLICT' ? 1 : 0) + (retB.code === 'CONFLICT' ? 1 : 0);

    if (winnerCount !== 1 || conflictCount !== 1) {
      throw new Error(`Fallo en carrera ${i}: OK=${winnerCount}, CONFLICT=${conflictCount}`);
    }

    const winnerRet = retA.code === 'OK' ? retA : retB;
    const raceReadBack = await sendUpstashCommand(["GET", raceKey]);
    const storedRaceEnv = typeof raceReadBack.data.result === 'string' ? JSON.parse(raceReadBack.data.result) : raceReadBack.data.result;

    if (storedRaceEnv.revision !== 11 || storedRaceEnv.checksum !== winnerRet.checksum) {
      throw new Error(`Fallo en verificación de iteración ${i}: Envelope persistido no coincide con el ganador.`);
    }

    // Clean up disposable key
    await sendUpstashCommand(["DEL", raceKey]);
  }

  // Clean up primary test key
  await sendUpstashCommand(["DEL", testKey]);

  console.log('- 20 Iteraciones de carrera real evaluadas en PROYECTOS-TEST:');
  console.log('  * EXACTAMENTE 1 Ganador (200 OK) y 1 Perdedor (409 CONFLICT) en cada iteración.');
  console.log('  * Revisión incrementada a 11.');
  console.log('  * Envelope persistido coincide 100% con el ganador.');
  console.log('  * Todas las claves desechables eliminadas al finalizar. ✅ EXITO');

  console.log('\n================================================================');
  console.log('🎉 INTEGRACIÓN REAL EVAL EN PROYECTOS-TEST COMPLETADA CON ÉXITO (100%)');
  console.log('================================================================\n');
}

runRealIntegrationSuite().catch(err => {
  console.error('❌ EXCEPCIÓN EN INTEGRACIÓN REAL:', err.message);
  process.exit(1);
});
