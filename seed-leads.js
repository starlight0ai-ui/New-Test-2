const db = require('./db/index');
const ins = db.prepare("INSERT OR IGNORE INTO leads (business_name,address,phone,website,rating,review_count,has_website,category,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?)");
ins.run('Pizza Palace Karachi', '24 Shaheed-e-Millat Rd, Karachi, Pakistan', '03001234567', '', 4.2, 120, 0, 'Restaurant', 24.8607, 67.0011);
ins.run('Dental Care Clinic', 'Block 6, PECHS, Karachi, Pakistan', '03217654321', 'https://dentalcare.pk', 2.8, 45, 1, 'Dentist', 24.8730, 67.0390);
ins.run('Quick Fix Plumbing', 'DHA Phase 5, Karachi, Pakistan', '03451239876', '', 3.9, 18, 0, 'Contractor', 24.8063, 67.0700);
ins.run('Taj Rooftop Restaurant', 'Clifton Block 9, Karachi, Pakistan', '03009871234', '', 4.8, 340, 0, 'Restaurant', 24.8261, 67.0178);
ins.run('Karachi Eye Centre', 'Saddar, Karachi, Pakistan', '02135623456', 'https://karachieye.com', 3.1, 67, 1, 'Medical', 24.8553, 67.0174);
console.log('Test leads inserted:', db.prepare('SELECT COUNT(*) as c FROM leads').get().c, 'total');
