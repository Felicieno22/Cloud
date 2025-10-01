document.addEventListener('DOMContentLoaded', function() {
    const depositForm = document.getElementById('depositForm');
    const withdrawForm = document.getElementById('withdrawForm');
    const cryptoHoldings = document.getElementById('cryptoHoldings');
    
    let currentBalance = 0;
    let cryptoPrices = {};

    // Fonction pour mettre à jour le solde
    async function updateBalance() {
        try {
            const response = await fetch('/api/wallet/balance');
            const data = await response.json();
            
            currentBalance = data.balance;
            document.getElementById('euroBalance').textContent = `€ ${currentBalance.toFixed(2)}`;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du solde:', error);
        }
    }

    // Fonction pour mettre à jour les holdings
    async function updateHoldings() {
        try {
            const [holdingsResponse, pricesResponse] = await Promise.all([
                fetch('/api/wallet/holdings'),
                fetch('/api/crypto/prices')
            ]);
            
            const holdings = await holdingsResponse.json();
            const prices = await pricesResponse.json();
            
            // Mettre à jour les prix
            prices.forEach(price => {
                cryptoPrices[price.crypto_id] = price.current_price;
            });
            
            // Calculer la valeur totale
            let totalValue = currentBalance;
            holdings.forEach(holding => {
                totalValue += holding.amount * cryptoPrices[holding.crypto_id];
            });
            
            document.getElementById('totalValue').textContent = `€ ${totalValue.toFixed(2)}`;
            
            // Mettre à jour l'affichage des holdings
            displayHoldings(holdings);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des holdings:', error);
        }
    }

    // Fonction pour afficher les holdings
    function displayHoldings(holdings) {
        cryptoHoldings.innerHTML = '';
        
        holdings.forEach(holding => {
            const value = holding.amount * cryptoPrices[holding.crypto_id];
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-4';
            
            col.innerHTML = `
                <div class="card crypto-holding">
                    <div class="card-body">
                        <h5 class="card-title">${holding.crypto_name}</h5>
                        <p class="card-text">
                            Quantité: ${holding.amount.toFixed(6)} ${holding.crypto_symbol}<br>
                            Valeur: € ${value.toFixed(2)}
                        </p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-outline-success" onclick="window.location.href='/market'">
                                Acheter plus
                            </button>
                            <button class="btn btn-outline-danger" onclick="window.location.href='/market'">
                                Vendre
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            cryptoHoldings.appendChild(col);
        });
    }

    // Gérer le formulaire de dépôt
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('depositAmount').value;

        try {
            const response = await fetch('/api/wallet/deposit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: parseFloat(amount) })
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Dépôt effectué avec succès');
                document.getElementById('depositAmount').value = '';
                updateBalance();
            } else {
                alert(data.error || 'Erreur lors du dépôt');
            }
        } catch (error) {
            console.error('Erreur lors du dépôt:', error);
            alert('Erreur lors du dépôt');
        }
    });

    // Gérer le formulaire de retrait
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('withdrawAmount').value;

        try {
            const response = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: parseFloat(amount) })
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Retrait effectué avec succès');
                document.getElementById('withdrawAmount').value = '';
                updateBalance();
            } else {
                alert(data.error || 'Erreur lors du retrait');
            }
        } catch (error) {
            console.error('Erreur lors du retrait:', error);
            alert('Erreur lors du retrait');
        }
    });

    // Initialisation
    updateBalance();
    updateHoldings();
    setInterval(() => {
        updateBalance();
        updateHoldings();
    }, 10000); // Mise à jour toutes les 10 secondes
});
