// Initialisation des variables globales
let priceChart;
let cryptoList = [];
let selectedCrypto = null;

// Fonction pour mettre à jour le solde du portefeuille
async function updateWalletBalance() {
    try {
        const response = await fetch('/api/wallet/balance');
        const data = await response.json();
        document.getElementById('balance').textContent = data.balance.toFixed(2);
    } catch (error) {
        console.error('Erreur lors de la récupération du solde:', error);
    }
}

// Fonction pour mettre à jour la liste des cryptomonnaies
async function updateCryptoList() {
    try {
        const response = await fetch('/api/crypto');
        cryptoList = await response.json();
        renderCryptoList();
    } catch (error) {
        console.error('Erreur lors de la récupération des cryptomonnaies:', error);
    }
}

// Fonction pour rendre la liste des cryptomonnaies
function renderCryptoList() {
    const container = document.getElementById('crypto-list');
    container.innerHTML = '';

    cryptoList.forEach(crypto => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card crypto-card">
                <div class="card-body">
                    <h5 class="card-title">${crypto.nomCrypto}</h5>
                    <p class="card-text">
                        <span class="price ${crypto.priceChange >= 0 ? 'price-up' : 'price-down'}">
                            € ${crypto.prix.toFixed(2)}
                        </span>
                        <small class="text-muted ms-2">
                            ${crypto.priceChange >= 0 ? '+' : ''}${crypto.priceChange}%
                        </small>
                    </p>
                    <div class="btn-group">
                        <button class="btn btn-success btn-sm" onclick="showBuyModal(${crypto.idCrypto})">Acheter</button>
                        <button class="btn btn-danger btn-sm" onclick="showSellModal(${crypto.idCrypto})">Vendre</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Fonction pour initialiser le graphique
function initPriceChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Prix',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Fonction pour mettre à jour le graphique
async function updatePriceChart(cryptoId) {
    try {
        const response = await fetch(`/api/crypto/${cryptoId}/history`);
        const history = await response.json();
        
        const labels = history.map(item => new Date(item.timestamp).toLocaleTimeString());
        const prices = history.map(item => item.price);

        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = prices;
        priceChart.update();
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des prix:', error);
    }
}

// Gestionnaire d'événements pour le formulaire de dépôt
document.getElementById('deposit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = e.target.elements.amount.value;
    
    try {
        const response = await fetch('/api/wallet/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Demande de dépôt créée. Veuillez vérifier votre email pour la validation.');
            $('#depositModal').modal('hide');
        } else {
            alert(data.error || 'Une erreur est survenue');
        }
    } catch (error) {
        console.error('Erreur lors du dépôt:', error);
        alert('Une erreur est survenue');
    }
});

// Gestionnaire d'événements pour le formulaire de retrait
document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = e.target.elements.amount.value;
    
    try {
        const response = await fetch('/api/wallet/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: parseFloat(amount) })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Demande de retrait créée. Veuillez vérifier votre email pour la validation.');
            $('#withdrawModal').modal('hide');
        } else {
            alert(data.error || 'Une erreur est survenue');
        }
    } catch (error) {
        console.error('Erreur lors du retrait:', error);
        alert('Une erreur est survenue');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const portfolioChart = document.getElementById('portfolioChart').getContext('2d');
    const holdingsList = document.getElementById('holdingsList');
    const recentTransactions = document.getElementById('recentTransactions');
    
    let chart;
    let cryptoPrices = {};

    // Fonction pour initialiser le graphique
    function initChart() {
        chart = new Chart(portfolioChart, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valeur du portefeuille',
                    data: [],
                    borderColor: '#0d6efd',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(13, 110, 253, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: value => `€ ${value.toFixed(2)}`
                        }
                    }
                }
            }
        });
    }

    // Fonction pour mettre à jour le solde total
    async function updateTotalBalance() {
        try {
            const [walletResponse, holdingsResponse, pricesResponse] = await Promise.all([
                fetch('/api/wallet/balance'),
                fetch('/api/wallet/holdings'),
                fetch('/api/crypto/prices')
            ]);
            
            const wallet = await walletResponse.json();
            const holdings = await holdingsResponse.json();
            const prices = await pricesResponse.json();
            
            // Mettre à jour les prix
            prices.forEach(price => {
                cryptoPrices[price.crypto_id] = price.current_price;
            });
            
            // Calculer la valeur totale
            let totalValue = wallet.balance;
            holdings.forEach(holding => {
                totalValue += holding.amount * cryptoPrices[holding.crypto_id];
            });
            
            document.getElementById('totalBalance').textContent = `€ ${totalValue.toFixed(2)}`;
            
            // Mettre à jour le graphique
            if (chart.data.labels.length > 20) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            chart.data.labels.push(new Date().toLocaleTimeString());
            chart.data.datasets[0].data.push(totalValue);
            chart.update();
            
            // Mettre à jour la liste des holdings
            displayHoldings(holdings);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du solde:', error);
        }
    }

    // Fonction pour afficher les holdings
    function displayHoldings(holdings) {
        holdingsList.innerHTML = '';
        
        holdings.forEach(holding => {
            const value = holding.amount * cryptoPrices[holding.crypto_id];
            const div = document.createElement('div');
            div.className = 'mb-3';
            
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${holding.crypto_name}</strong><br>
                        <small class="text-muted">${holding.amount.toFixed(6)} ${holding.crypto_symbol}</small>
                    </div>
                    <div class="text-end">
                        <strong>€ ${value.toFixed(2)}</strong>
                    </div>
                </div>
            `;
            
            holdingsList.appendChild(div);
        });
    }

    // Fonction pour charger les transactions récentes
    async function loadRecentTransactions() {
        try {
            const response = await fetch('/api/transactions/recent');
            const transactions = await response.json();
            
            document.getElementById('transactionCount').textContent = 
                `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} récente${transactions.length !== 1 ? 's' : ''}`;
            
            displayTransactions(transactions);
        } catch (error) {
            console.error('Erreur lors du chargement des transactions:', error);
        }
    }

    // Fonction pour afficher les transactions
    function displayTransactions(transactions) {
        recentTransactions.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(transaction.created_at).toLocaleString()}</td>
                <td>${getTransactionLabel(transaction.type)}</td>
                <td>${formatAmount(transaction.amount, transaction.type, transaction.crypto_symbol)}</td>
                <td>${transaction.unit_price ? `€ ${transaction.unit_price.toFixed(2)}` : '-'}</td>
                <td>
                    <span class="badge ${transaction.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                        ${transaction.status === 'completed' ? 'Complété' : 'En attente'}
                    </span>
                </td>
            `;
            
            recentTransactions.appendChild(row);
        });
    }

    // Fonction pour obtenir le libellé du type de transaction
    function getTransactionLabel(type) {
        const labels = {
            buy: 'Achat',
            sell: 'Vente',
            deposit: 'Dépôt',
            withdraw: 'Retrait'
        };
        return labels[type] || type;
    }

    // Fonction pour formater le montant
    function formatAmount(amount, type, symbol) {
        if (type === 'deposit' || type === 'withdraw') {
            return `€ ${amount.toFixed(2)}`;
        }
        return `${amount.toFixed(6)} ${symbol}`;
    }

    // Initialisation
    initChart();
    updateTotalBalance();
    loadRecentTransactions();
    
    // Mise à jour périodique
    setInterval(() => {
        updateTotalBalance();
        loadRecentTransactions();
    }, 10000); // Mise à jour toutes les 10 secondes
});
