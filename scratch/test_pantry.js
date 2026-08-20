async function testPantry() {
  try {
    const res = await fetch('https://getpantry.cloud/apiv1/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'rc_proyectos_studio_v1' })
    });
    const text = await res.text();
    console.log('Pantry creation status:', res.status, 'Response:', text);
  } catch (e) {
    console.error('Pantry error:', e);
  }
}

testPantry();
