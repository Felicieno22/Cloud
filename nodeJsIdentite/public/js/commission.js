// Gestion du formulaire des taux de commission
document.getElementById('commissionRatesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const buyRate = parseFloat(document.getElementById('buyRate').value);
    const sellRate = parseFloat(document.getElementById('sellRate').value);
    
    try {
        const response = await fetch('/api/analysis/commission-rates', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                buyRate,
                sellRate
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Taux de commission mis à jour avec succès');
        } else {
            alert(data.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue');
    }
});

// Gestion du formulaire d'analyse des commissions
document.getElementById('commissionAnalysisForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('analysisType').value;
    const crypto = document.getElementById('cryptoSelect').value;
    const dateMin = document.getElementById('dateMin').value;
    const dateMax = document.getElementById('dateMax').value;
    
    try {
        const response = await fetch('/api/analysis/commissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type,
                crypto,
                dateMin,
                dateMax
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const resultDiv = document.getElementById('commissionResult');
            resultDiv.classList.remove('d-none');
            resultDiv.querySelector('.result-value').textContent = 
                `${type} des commissions: ${data.value.toFixed(2)} €`;
        } else {
            alert(data.error || 'Erreur lors de l\'analyse');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue');
    }
});

// Charger les taux de commission actuels au chargement de la page
async function loadCurrentRates() {
    try {
        const response = await fetch('/api/analysis/commission-rates');
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('buyRate').value = data.buyRate;
            document.getElementById('sellRate').value = data.sellRate;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des taux:', error);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentRates();
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('dateMin').value = oneWeekAgo.toISOString().slice(0, 16);
    document.getElementById('dateMax').value = now.toISOString().slice(0, 16);
});
