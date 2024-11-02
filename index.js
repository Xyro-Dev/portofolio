const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

// Token dan Zone ID dari Cloudflare
const CF_API_TOKEN = 'r7HmNu5K7Ul0UrbR2RkNadk027P6EQziKgwtR4BW';
const CF_ZONE_ID = '57ca0e62ca0d45e934a65517f9814264';
const REQUEST_THRESHOLD = 100; // Batas request per menit
const CHECK_INTERVAL = 60000; // Interval pengecekan dalam milidetik (60 detik)

let requestCount = 0;
let isUAMEnabled = false;

// Middleware untuk menghitung jumlah request
app.use((req, res, next) => {
  requestCount++;
  next();
});

// Fungsi untuk mengubah mode UAM
async function setUAMMode(enable) {
  try {
    const response = await axios.patch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level`,
      { value: enable ? 'under_attack' : 'medium' },
      {
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`UAM ${enable ? 'enabled' : 'disabled'}:`, response.data);
  } catch (error) {
    console.error('Failed to update UAM mode:', error);
  }
}

// Interval untuk mengecek dan mengaktifkan/menonaktifkan UAM
setInterval(() => {
  if (requestCount > REQUEST_THRESHOLD && !isUAMEnabled) {
    setUAMMode(true); // Aktifkan UAM jika melebihi threshold
    isUAMEnabled = true;
  } else if (requestCount <= REQUEST_THRESHOLD && isUAMEnabled) {
    setUAMMode(false); // Nonaktifkan UAM jika kembali normal
    isUAMEnabled = false;
  }
  requestCount = 0; // Reset jumlah request setiap interval
}, CHECK_INTERVAL);

app.use(express.static('public'));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/icons', express.static(path.join(__dirname, 'public/icons')));
app.use('/favicon', express.static(path.join(__dirname, 'public/favicon')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});