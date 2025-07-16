// Data storage
let progressData = JSON.parse(localStorage.getItem('gymProgress')) || [];
let currentPage = 1;
const entriesPerPage = 10;
let editId = null;
let confirmAction = null;

// DOM Elements
const form = document.getElementById('progress-form');
const tableBody = document.getElementById('progress-table-body');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const tableInfo = document.getElementById('table-info');
const clearFormBtn = document.getElementById('clear-form');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const resetBtn = document.getElementById('reset-btn');
const editModal = document.getElementById('edit-modal');
const closeModal = document.getElementById('close-modal');
const cancelEdit = document.getElementById('cancel-edit');
const editForm = document.getElementById('edit-form');
const confirmModal = document.getElementById('confirm-modal');
const closeConfirm = document.getElementById('close-confirm');
const cancelConfirm = document.getElementById('cancel-confirm');
const confirmActionBtn = document.getElementById('confirm-action');
const confirmMessage = document.getElementById('confirm-message');

// Charts
let weightChart, caloriesChart, gymChart, progressChart;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    updateStats();
    initCharts();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
});

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const calories = parseInt(document.getElementById('calories').value);
    const gym = document.querySelector('input[name="gym"]:checked').value;
    
    // Check if entry for this date already exists
    const existingIndex = progressData.findIndex(entry => entry.date === date);
    
    if (existingIndex !== -1) {
        // Update existing entry
        progressData[existingIndex] = { date, weight, calories, gym };
    } else {
        // Add new entry
        progressData.push({ date, weight, calories, gym });
    }
    
    // Sort by date (newest first)
    progressData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    saveData();
    renderTable();
    updateStats();
    updateCharts();
    form.reset();
    
    // Reset date to today
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
});

// Clear form
clearFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    form.reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
});

// Pagination
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(progressData.length / entriesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Export data
exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(progressData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'gym-progress-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
});

// Import data
importBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                showConfirm(
                    'Import will replace all current data. Are you sure?',
                    () => {
                        progressData = importedData;
                        saveData();
                        renderTable();
                        updateStats();
                        updateCharts();
                        importFile.value = '';
                    }
                );
            } else {
                alert('Invalid data format. Please import a valid JSON file.');
            }
        } catch (error) {
            alert('Error parsing the file. Please check the file format.');
        }
    };
    reader.readAsText(file);
});

// Reset data
resetBtn.addEventListener('click', () => {
    showConfirm(
        'This will permanently delete all your progress data. Are you sure?',
        () => {
            progressData = [];
            saveData();
            renderTable();
            updateStats();
            updateCharts();
        }
    );
});

// Modal controls
closeModal.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

cancelEdit.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

closeConfirm.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
});

cancelConfirm.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
});

confirmActionBtn.addEventListener('click', () => {
    if (confirmAction) {
        confirmAction();
    }
    confirmModal.classList.add('hidden');
});

// Edit form submission
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const date = document.getElementById('edit-date').value;
    const weight = parseFloat(document.getElementById('edit-weight').value);
    const calories = parseInt(document.getElementById('edit-calories').value);
    const gym = document.querySelector('input[name="edit-gym"]:checked').value;
    
    const index = progressData.findIndex(entry => entry.date === editId);
    if (index !== -1) {
        progressData[index] = { date, weight, calories, gym };
        
        // Sort by date (newest first)
        progressData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        saveData();
        renderTable();
        updateStats();
        updateCharts();
        editModal.classList.add('hidden');
    }
});

// Helper functions
function saveData() {
    localStorage.setItem('gymProgress', JSON.stringify(progressData));
}

function renderTable() {
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, progressData.length);
    const pageData = progressData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                No data available. Add your first entry above!
            </td>
        `;
        tableBody.appendChild(row);
    } else {
        pageData.forEach(entry => {
            const row = document.createElement('tr');
            row.className = entry.gym === 'yes' ? 'gym-day' : '';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${formatDate(entry.date)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${entry.weight.toFixed(1)} kg</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${entry.calories} kcal</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.gym === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${entry.gym === 'yes' ? 'Yes' : 'No'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 mr-3 edit-btn" data-date="${entry.date}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-btn" data-date="${entry.date}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.currentTarget.getAttribute('data-date');
                editEntry(date);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.currentTarget.getAttribute('data-date');
                deleteEntry(date);
            });
        });
    }
    
    // Update pagination controls
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(progressData.length / entriesPerPage);
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    tableInfo.textContent = `Showing ${((currentPage - 1) * entriesPerPage) + 1} to ${Math.min(currentPage * entriesPerPage, progressData.length)} of ${progressData.length} entries`;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function editEntry(date) {
    const entry = progressData.find(entry => entry.date === date);
    if (entry) {
        editId = entry.date;
        document.getElementById('edit-date').value = entry.date;
        document.getElementById('edit-weight').value = entry.weight;
        document.getElementById('edit-calories').value = entry.calories;
        document.querySelector(`input[name="edit-gym"][value="${entry.gym}"]`).checked = true;
        
        editModal.classList.remove('hidden');
    }
}

function deleteEntry(date) {
    showConfirm(
        'Are you sure you want to delete this entry?',
        () => {
            progressData = progressData.filter(entry => entry.date !== date);
            saveData();
            
            // Adjust current page if needed
            const totalPages = Math.ceil(progressData.length / entriesPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                currentPage = totalPages;
            }
            
            renderTable();
            updateStats();
            updateCharts();
        }
    );
}

function showConfirm(message, action) {
    confirmMessage.textContent = message;
    confirmAction = action;
    confirmModal.classList.remove('hidden');
}

function updateStats() {
    if (progressData.length === 0) {
        document.getElementById('current-weight').textContent = '-- kg';
        document.getElementById('weight-change').textContent = '--';
        document.getElementById('avg-calories').textContent = '-- kcal';
        document.getElementById('calories-trend').textContent = '--';
        document.getElementById('gym-days').textContent = '--';
        document.getElementById('gym-frequency').textContent = '--';
        document.getElementById('current-streak').textContent = '-- days';
        document.getElementById('streak-status').textContent = '--';
        return;
    }
    
    // Current weight
    const currentWeight = progressData[0].weight;
    document.getElementById('current-weight').textContent = `${currentWeight.toFixed(1)} kg`;
    
    // Weight change
    if (progressData.length > 1) {
        const previousWeight = progressData[1].weight;
        const change = currentWeight - previousWeight;
        const changeElement = document.getElementById('weight-change');
        
        if (change > 0) {
            changeElement.innerHTML = `<span class="text-red-500"><i class="fas fa-caret-up mr-1"></i>+${change.toFixed(1)} kg</span>`;
        } else if (change < 0) {
            changeElement.innerHTML = `<span class="text-green-500"><i class="fas fa-caret-down mr-1"></i>${change.toFixed(1)} kg</span>`;
        } else {
            changeElement.innerHTML = `<span class="text-gray-500">No change</span>`;
        }
    } else {
        document.getElementById('weight-change').innerHTML = '<span class="text-gray-500">First entry</span>';
    }
    
    // Average calories
    const totalCalories = progressData.reduce((sum, entry) => sum + entry.calories, 0);
    const avgCalories = Math.round(totalCalories / progressData.length);
    document.getElementById('avg-calories').textContent = `${avgCalories} kcal`;
    
    // Calories trend
    if (progressData.length > 1) {
        const currentCalories = progressData[0].calories;
        const previousCalories = progressData[1].calories;
        const trend = currentCalories - previousCalories;
        const trendElement = document.getElementById('calories-trend');
        
        if (trend > 0) {
            trendElement.innerHTML = `<span class="text-red-500"><i class="fas fa-caret-up mr-1"></i>+${trend} kcal from last</span>`;
        } else if (trend < 0) {
            trendElement.innerHTML = `<span class="text-green-500"><i class="fas fa-caret-down mr-1"></i>${trend} kcal from last</span>`;
        } else {
            trendElement.innerHTML = `<span class="text-gray-500">No change</span>`;
        }
    } else {
        document.getElementById('calories-trend').innerHTML = '<span class="text-gray-500">First entry</span>';
    }
    
    // Gym days
    const gymDays = progressData.filter(entry => entry.gym === 'yes').length;
    document.getElementById('gym-days').textContent = gymDays;
    
    // Gym frequency
    const gymFrequency = Math.round((gymDays / progressData.length) * 100);
    document.getElementById('gym-frequency').textContent = `${gymFrequency}% of days`;
    
    // Current streak
    let currentStreak = 0;
    let streakType = null; // 'gym' or 'calories' or 'weight'
    
    // Check for gym streak
    for (let i = 0; i < progressData.length; i++) {
        if (progressData[i].gym === 'yes') {
            currentStreak++;
        } else {
            break;
        }
    }
    
    // If no gym streak, check for weight loss streak
    if (currentStreak === 0) {
        for (let i = 0; i < progressData.length - 1; i++) {
            if (progressData[i].weight < progressData[i + 1].weight) {
                currentStreak++;
                streakType = 'weight';
            } else {
                break;
            }
        }
    } else {
        streakType = 'gym';
    }
    
    document.getElementById('current-streak').textContent = `${currentStreak} days`;
    
    const streakStatus = document.getElementById('streak-status');
    if (streakType === 'gym') {
        streakStatus.innerHTML = `<span class="text-green-600">Gym streak! <i class="fas fa-fire ml-1"></i></span>`;
    } else if (streakType === 'weight') {
        streakStatus.innerHTML = `<span class="text-blue-600">Weight loss streak! <i class="fas fa-trophy ml-1"></i></span>`;
    } else {
        streakStatus.innerHTML = `<span class="text-gray-500">No active streak</span>`;
    }
}

function initCharts() {
    const ctx1 = document.getElementById('weight-chart').getContext('2d');
    const ctx2 = document.getElementById('calories-chart').getContext('2d');
    const ctx3 = document.getElementById('gym-chart').getContext('2d');
    const ctx4 = document.getElementById('progress-chart').getContext('2d');
    
    weightChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight (kg)',
                data: [],
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Weight: ${context.parsed.y.toFixed(1)} kg`;
                        }
                    }
                }
            }
        }
    });
    
    caloriesChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Calories Intake',
                data: [],
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Calories: ${context.parsed.y} kcal`;
                        }
                    }
                }
            }
        }
    });
    
    gymChart = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['Gym Days', 'Rest Days'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(156, 163, 175, 0.7)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(156, 163, 175, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    progressChart = new Chart(ctx4, {
        type: 'radar',
        data: {
            labels: ['Consistency', 'Weight Progress', 'Calories Control', 'Gym Frequency'],
            datasets: [{
                label: 'Progress',
                data: [0, 0, 0, 0],
                backgroundColor: 'rgba(249, 168, 37, 0.2)',
                borderColor: 'rgba(249, 168, 37, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(249, 168, 37, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    updateCharts();
}

function updateCharts() {
    if (progressData.length === 0) {
        // Reset charts if no data
        weightChart.data.labels = [];
        weightChart.data.datasets[0].data = [];
        
        caloriesChart.data.labels = [];
        caloriesChart.data.datasets[0].data = [];
        
        gymChart.data.datasets[0].data = [0, 0];
        
        progressChart.data.datasets[0].data = [0, 0, 0, 0];
    } else {
        // Prepare data for charts
        const sortedData = [...progressData].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Weight chart
        weightChart.data.labels = sortedData.map(entry => formatDate(entry.date));
        weightChart.data.datasets[0].data = sortedData.map(entry => entry.weight);
        
        // Calories chart
        caloriesChart.data.labels = sortedData.map(entry => formatDate(entry.date));
        caloriesChart.data.datasets[0].data = sortedData.map(entry => entry.calories);
        
        // Gym chart
        const gymDays = sortedData.filter(entry => entry.gym === 'yes').length;
        const restDays = sortedData.length - gymDays;
        gymChart.data.datasets[0].data = [gymDays, restDays];
        
        // Progress chart
        const consistencyScore = Math.min(100, Math.round((sortedData.length / 30) * 100)); // Based on entries in last 30 days
        
        let weightScore = 50;
        if (sortedData.length > 1) {
            const weightChange = sortedData[sortedData.length - 1].weight - sortedData[0].weight;
            weightScore = weightChange < 0 ? 100 - (weightChange * -10) : 100 - (weightChange * 10);
            weightScore = Math.max(0, Math.min(100, weightScore));
        }
        
        const avgCalories = sortedData.reduce((sum, entry) => sum + entry.calories, 0) / sortedData.length;
        const caloriesScore = Math.max(0, Math.min(100, 2000 / avgCalories * 50)); // Assuming 2000 kcal is target
        
        const gymFrequency = gymDays / sortedData.length;
        const gymScore = Math.round(gymFrequency * 100);
        
        progressChart.data.datasets[0].data = [
            consistencyScore,
            weightScore,
            caloriesScore,
            gymScore
        ];
    }
    
    // Update all charts
    weightChart.update();
    caloriesChart.update();
    gymChart.update();
    progressChart.update();
}