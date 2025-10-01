// Gestion du formulaire d'analyse des cryptomonnaies
document.getElementById('cryptoAnalysisForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('analysisType').value;
    const crypto = document.querySelector('input[name="crypto"]:checked').value;
    const dateMin = document.getElementById('dateMin').value;
    const dateMax = document.getElementById('dateMax').value;
    
    try {
        const response = await fetch('/api/analysis/crypto', {
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
            // Afficher le résultat
            const resultDiv = document.getElementById('analysisResult');
            resultDiv.classList.remove('d-none');
            resultDiv.querySelector('.result-value').textContent = 
                `${type}: ${data.value.toFixed(2)}`;
            
            // Ajouter au tableau
            addToAnalysisTable(data);
        } else {
            alert(data.error || 'Erreur lors de l\'analyse');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue');
    }
});

// Fonction pour ajouter une ligne au tableau des résultats
function addToAnalysisTable(data) {
    const tbody = document.getElementById('analysisTable');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${data.type}</td>
        <td>${data.crypto}</td>
        <td>${data.value.toFixed(2)}</td>
        <td>${new Date(data.dateMin).toLocaleString()}</td>
        <td>${new Date(data.dateMax).toLocaleString()}</td>
    `;
    
    tbody.insertBefore(row, tbody.firstChild);
}

// Initialisation des dates par défaut
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('dateMin').value = oneWeekAgo.toISOString().slice(0, 16);
    document.getElementById('dateMax').value = now.toISOString().slice(0, 16);
});
