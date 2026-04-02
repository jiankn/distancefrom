const OSRM_BASE = 'https://router.project-osrm.org/table/v1/driving';

async function testMatrix() {
  const coords = [];
  for(let i=0; i<100; i++) {
    coords.push(`${-73.98 + i*0.001},${40.76 + i*0.001}`);
  }
  const sources = Array.from({length: 50}, (_, i) => i).join(';');
  const dests = Array.from({length: 50}, (_, i) => i + 50).join(';');
  const url = `${OSRM_BASE}/${coords.join(';')}?sources=${sources}&destinations=${dests}&annotations=duration,distance`;
  
  console.log('Fetching', coords.length, 'coordinates...');
  const res = await fetch(url);
  const data = await res.json();
  if (data.code === 'Ok') {
    console.log(`Success! Got ${data.distances.length}x${data.distances[0].length} distances.`);
    console.log('Sample dist:', data.distances[0][0]);
  } else {
    console.log('Error:', data);
  }
}
testMatrix();
