// Connect to Socket.IO server
const socket = io();

// DOM Elements
const statusLampu = document.getElementById('status-lampu');
const statusWaktu = document.getElementById('status-waktu');
const statusKepadatan = document.getElementById('status-kepadatan');
const statusJarak = document.getElementById('status-jarak');
const historyTableBody = document.getElementById('history-table-body');
const lightRed = document.getElementById('light-red');
const lightYellow = document.getElementById('light-yellow');
const lightGreen = document.getElementById('light-green');

// Statistics elements
const statSangatPadat = document.getElementById('stat-sangat-padat');
const statPadat = document.getElementById('stat-padat');
const statNormal = document.getElementById('stat-normal');
const statSepi = document.getElementById('stat-sepi');

// Initialize Chart
let densityChart;
let historyData = [];

// Function to update traffic light display
function updateTrafficLight(status) {
  // Reset all lights
  lightRed.classList.remove('active');
  lightYellow.classList.remove('active');
  lightGreen.classList.remove('active');
  
  // Activate the current light
  if (status === 'Merah') {
    lightRed.classList.add('active');
  } else if (status === 'Kuning') {
    lightYellow.classList.add('active');
  } else if (status === 'Hijau') {
    lightGreen.classList.add('active');
  }
}

// Function to update real-time status
function updateStatus(data) {
  statusLampu.textContent = data.lampu;
  statusWaktu.textContent = data.sisa_detik;
  statusKepadatan.textContent = data.deteksi;
  statusJarak.textContent = data.jarak_cm;
  
  updateTrafficLight(data.lampu);
  
  // Add to history data (limit to 10 entries for display)
  const newEntry = {
    timestamp: new Date(),
    lampuStatus: data.lampu,
    deteksi: data.deteksi,
    jarakCm: data.jarak_cm
  };
  
  historyData.unshift(newEntry);
  if (historyData.length > 10) {
    historyData.pop();
  }
  
  updateHistoryTable();
}

// Function to update history table
function updateHistoryTable() {
  historyTableBody.innerHTML = '';
  
  historyData.forEach(entry => {
    const row = document.createElement('tr');
    
    const timeCell = document.createElement('td');
    timeCell.textContent = moment(entry.timestamp).format('HH:mm:ss');
    
    const statusCell = document.createElement('td');
    statusCell.textContent = entry.lampuStatus;
    
    const densityCell = document.createElement('td');
    densityCell.textContent = entry.deteksi;
    
    const distanceCell = document.createElement('td');
    distanceCell.textContent = entry.jarakCm;
    
    row.appendChild(timeCell);
    row.appendChild(statusCell);
    row.appendChild(densityCell);
    row.appendChild(distanceCell);
    
    historyTableBody.appendChild(row);
  });
}

// Function to initialize density chart
function initDensityChart() {
  const ctx = document.getElementById('densityChart').getContext('2d');
  
  densityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Kepadatan Lalu Lintas',
        data: [],
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Jarak (cm)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Waktu'
          }
        }
      }
    }
  });
}

// Function to update chart with new data
function updateChart(data) {
  // Add new data point
  densityChart.data.labels.push(moment().format('HH:mm:ss'));
  densityChart.data.datasets[0].data.push(data.jarak_cm);
  
  // Keep only the last 20 data points for better visualization
  if (densityChart.data.labels.length > 20) {
    densityChart.data.labels.shift();
    densityChart.data.datasets[0].data.shift();
  }
  
  densityChart.update();
}

// Function to fetch and display statistics
async function fetchStatistics() {
  try {
    const response = await fetch('/api/traffic/stats');
    const stats = await response.json();
    
    // Reset all stats
    statSangatPadat.textContent = '0';
    statPadat.textContent = '0';
    statNormal.textContent = '0';
    statSepi.textContent = '0';
    
    // Update with actual data
    stats.forEach(stat => {
      switch(stat._id) {
        case 'Sangat Padat':
          statSangatPadat.textContent = stat.count;
          break;
        case 'Padat':
          statPadat.textContent = stat.count;
          break;
        case 'Normal':
          statNormal.textContent = stat.count;
          break;
        case 'Sepi':
          statSepi.textContent = stat.count;
          break;
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
}

// Function to fetch historical data for chart
async function fetchHistoricalData() {
  try {
    const response = await fetch('/api/traffic/history');
    const history = await response.json();
    
    // Clear existing chart data
    densityChart.data.labels = [];
    densityChart.data.datasets[0].data = [];
    
    // Add historical data points (use every 10th point to avoid overcrowding)
    for (let i = 0; i < history.length; i += 10) {
      const entry = history[i];
      densityChart.data.labels.push(moment(entry.timestamp).format('HH:mm'));
      densityChart.data.datasets[0].data.push(entry.jarakCm);
    }
    
    densityChart.update();
  } catch (error) {
    console.error('Error fetching historical data:', error);
  }
}

// Socket.IO event listeners
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('trafficUpdate', (data) => {
  updateStatus(data);
  updateChart(data);
});

// Function to initialize manual control
function initManualControl() {
  const extendGreenBtn = document.getElementById('extend-green');
  const forceRedBtn = document.getElementById('force-red');
  const forceGreenBtn = document.getElementById('force-green');
  const autoModeBtn = document.getElementById('auto-mode');
  const durationInput = document.getElementById('duration');
  
  extendGreenBtn.addEventListener('click', () => {
    sendControlCommand('extend', durationInput.value);
  });
  
  forceRedBtn.addEventListener('click', () => {
    sendControlCommand('force_red', durationInput.value);
  });
  
  forceGreenBtn.addEventListener('click', () => {
    sendControlCommand('force_green', durationInput.value);
  });
  
  autoModeBtn.addEventListener('click', () => {
    sendControlCommand('auto', 0);
  });
}

// Function to send control commands to the server
async function sendControlCommand(action, duration) {
  try {
    const response = await fetch('/api/traffic/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, duration })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(`Perintah ${action} berhasil dikirim`, 'success');
    } else {
      showNotification('Gagal mengirim perintah', 'error');
    }
  } catch (error) {
    console.error('Error sending control command:', error);
    showNotification('Terjadi kesalahan saat mengirim perintah', 'error');
  }
}

// Function to show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize chart
  initDensityChart();
  
  // Initialize theme toggle
  initThemeToggle();
  
  // Initialize manual control
  initManualControl();
  
  // Fetch initial data
  fetch('/api/traffic/latest')
    .then(response => response.json())
    .then(data => {
      if (data) {
        updateStatus({
          lampu: data.lampuStatus,
          sisa_detik: data.sisaDetik,
          jarak_cm: data.jarakCm,
          deteksi: data.deteksi
        });
      }
    })
    .catch(error => console.error('Error fetching initial data:', error));
  
  // Fetch historical data for chart
  fetchHistoricalData();
  
  // Fetch statistics
  fetchStatistics();
  
  //
});