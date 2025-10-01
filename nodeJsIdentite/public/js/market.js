document.addEventListener('DOMContentLoaded', function() {
    const cryptoList = document.getElementById('cryptoList');
    const transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
    const transactionForm = document.getElementById('transactionForm');
    
    let cryptoPrices = {};
    let charts = {};

    // Fonction pour mettre à jour les prix
    async function updatePrices() {
        try {
            const response = await fetch('/api/crypto/prices');
            const prices = await response.json();
            
            prices.forEach(price => {
                cryptoPrices[price.crypto_id] = price.current_price;
                updatePriceDisplay(price.crypto_id, price.current_price);
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des prix:', error);
        }
    }

    // Fonction pour créer une carte de cryptomonnaie
    function createCryptoCard(crypto) {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        
        col.innerHTML = `
            <div class="card crypto-card">
                <div class="card-body">
                    <h5 class="card-title">${crypto.name}</h5>
                    <p class="card-text">
                        <span class="price" id="price-${crypto.id}">€ ${crypto.current_price}</span>
                    </p>
                    <canvas id="chart-${crypto.id}" height="100"></canvas>
                    <div class="d-flex justify-content-between mt-3">
                        <button class="btn btn-success" onclick="initiateTransaction(${crypto.id}, 'buy')">
                            Acheter
                        </button>
                        <button class="btn btn-danger" onclick="initiateTransaction(${crypto.id}, 'sell')">
                            Vendre
                        </button>
                    </div>
                </div>
            </div>
        `;

        cryptoList.appendChild(col);
        initChart(crypto.id);
    }

    // Fonction pour initialiser un graphique
    function initChart(cryptoId) {
        const ctx = document.getElementById(`chart-${cryptoId}`).getContext('2d');
        charts[cryptoId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Prix',
                    data: [],
                    borderColor: '#0d6efd',
                    tension: 0.4
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
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Fonction pour mettre à jour l'affichage du prix
    function updatePriceDisplay(cryptoId, newPrice) {
        const priceElement = document.getElementById(`price-${cryptoId}`);
        if (priceElement) {
            const oldPrice = parseFloat(priceElement.dataset.price || newPrice);
            priceElement.dataset.price = newPrice;
            priceElement.textContent = `€ ${newPrice.toFixed(2)}`;
            
            // Ajouter une classe pour l'animation de changement de prix
            priceElement.classList.remove('price-up', 'price-down');
            priceElement.classList.add(newPrice > oldPrice ? 'price-up' : 'price-down');

            // Mettre à jour le graphique
            if (charts[cryptoId]) {
                const chart = charts[cryptoId];
                if (chart.data.labels.length > 20) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                
                chart.data.labels.push(new Date().toLocaleTimeString());
                chart.data.datasets[0].data.push(newPrice);
                chart.update();
            }
        }
    }

    // Fonction pour initier une transaction
    window.initiateTransaction = function(cryptoId, type) {
        document.getElementById('cryptoId').value = cryptoId;
        document.getElementById('transactionType').value = type;
        document.getElementById('amount').value = '';
        document.getElementById('estimatedPrice').value = '';
        
        // Mettre à jour le titre du modal
        const modalTitle = document.querySelector('#transactionModal .modal-title');
        modalTitle.textContent = type === 'buy' ? 'Acheter' : 'Vendre';
        
        transactionModal.show();
    };

    // Gestionnaire pour le calcul du prix estimé
    document.getElementById('amount').addEventListener('input', function(e) {
        const amount = parseFloat(e.target.value);
        const cryptoId = document.getElementById('cryptoId').value;
        const price = cryptoPrices[cryptoId];
        
        if (amount && price) {
            const total = amount * price;
            document.getElementById('estimatedPrice').value = total.toFixed(2);
        }
    });

    // Gestionnaire pour la soumission du formulaire de transaction
    transactionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const type = formData.get('transactionType');
        
        try {
            const response = await fetch(`/api/crypto/${type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cryptoId: formData.get('cryptoId'),
                    amount: formData.get('amount')
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Transaction réussie !');
                transactionModal.hide();
            } else {
                alert(result.error || 'Erreur lors de la transaction');
            }
        } catch (error) {
            console.error('Erreur lors de la transaction:', error);
            alert('Une erreur est survenue');
        }
    });

    // Charger les cryptomonnaies initiales
    async function loadCryptos() {
        try {
            const response = await fetch('/api/crypto/list');
            const cryptos = await response.json();
            
            cryptos.forEach(crypto => {
                createCryptoCard(crypto);
                cryptoPrices[crypto.id] = crypto.current_price;
            });
        } catch (error) {
            console.error('Erreur lors du chargement des cryptomonnaies:', error);
        }
    }

    // Initialisation
    loadCryptos();
    setInterval(updatePrices, 10000); // Mise à jour toutes les 10 secondes
});
