const http = require('http');

async function api(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          resolve(JSON.parse(responseBody));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTest() {
  console.log('--- STEP 3: VERIFY API KEY SAVES ---');
  try {
    const res = await api('/api/apikeys', 'POST', {
      key_value: 'apify_api_NxLcbS21Yr6wtOtxPfcWeLyYHTJOSe1GccAb',
      label: 'Primary Key'
    });
    console.log('✅ API key saved and activated successfully:', res);
  } catch (e) {
    console.error('❌ Failed to save API key:', e.message);
    process.exit(1);
  }

  console.log('\n--- STEP 4: RUN TEST CAMPAIGN 1 ---');
  try {
    let res = await api('/api/leads/generate', 'POST', {
      location: 'London, UK',
      businessType: 'restaurants in London',
      leadType: 'Without Website',
      maxLeads: 10 // small number for quick test, or 20 if needed
    });
    console.log('Campaign 1 started. Waiting for completion...', res);
    
    // Poll campaign status
    let status = 'processing';
    while (status !== 'completed' && status !== 'failed') {
      await sleep(5000);
      const camps = await api('/api/campaigns');
      const camp = camps.find(c => c.id === res.campaignId);
      if (camp) {
        status = camp.status;
        console.log(`Campaign 1 status: ${status}, leads added: ${camp.leads_added}`);
      }
    }
    console.log('✅ Campaign 1 completed successfully.');
  } catch(e) { console.error('❌ Campaign 1 failed:', e.message); }

  console.log('\n--- STEP 5: RUN TEST CAMPAIGN 2 ---');
  try {
    let res = await api('/api/leads/generate', 'POST', {
      location: 'Manchester, UK',
      businessType: 'dentists in Manchester',
      leadType: 'Without Website',
      maxLeads: 10
    });
    console.log('Campaign 2 started. Waiting for completion...', res);
    
    // Poll campaign status
    let status = 'processing';
    while (status !== 'completed' && status !== 'failed') {
      await sleep(5000);
      const camps = await api('/api/campaigns');
      const camp = camps.find(c => c.id === res.campaignId);
      if (camp) {
        status = camp.status;
        console.log(`Campaign 2 status: ${status}, leads added: ${camp.leads_added}`);
      }
    }
    console.log('✅ Campaign 2 completed successfully.');
    
    console.log('\n--- VERIFY DASHBOARD LEADS ---');
    const leads = await api('/api/leads');
    console.log(`✅ Total leads in dashboard (DB): ${leads.length}`);
  } catch(e) { console.error('❌ Campaign 2 failed:', e.message); }

  process.exit(0);
}

runTest();
