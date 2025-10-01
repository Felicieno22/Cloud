document.addEventListener('DOMContentLoaded', function() {
    const transactionsList = document.getElementById('transactionsList');
    const pagination = document.getElementById('transactionsPagination');
    const filterButtons = document.querySelectorAll('[data-filter]');
    
    let currentPage = 1;
    let currentFilter = 'all';
    const itemsPerPage = 10;

    // Fonction pour formater la date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Fonction pour formater le montant
    function formatAmount(amount, type, symbol) {
        if (type === 'deposit' || type === 'withdraw') {
            return `€ ${amount.toFixed(2)}`;
        }
        return `${amount.toFixed(6)} ${symbol}`;
    }

    // Fonction pour obtenir la classe CSS du type de transaction
    function getTransactionClass(type) {
        const classes = {
            buy: 'transaction-buy',
            sell: 'transaction-sell',
            deposit: 'transaction-deposit',
            withdraw: 'transaction-withdraw'
        };
        return classes[type] || '';
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

    // Fonction pour charger les transactions
    async function loadTransactions(page = 1, filter = 'all') {
        try {
            const response = await fetch(`/api/transactions/list?page=${page}&filter=${filter}`);
            const data = await response.json();
            
            displayTransactions(data.transactions);
            updatePagination(data.totalPages, page);
        } catch (error) {
            console.error('Erreur lors du chargement des transactions:', error);
        }
    }

    // Fonction pour afficher les transactions
    function displayTransactions(transactions) {
        transactionsList.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = getTransactionClass(transaction.type);
            
            row.innerHTML = `
                <td>${formatDate(transaction.created_at)}</td>
                <td>${getTransactionLabel(transaction.type)}</td>
                <td>${formatAmount(transaction.amount, transaction.type, transaction.crypto_symbol)}</td>
                <td>${transaction.unit_price ? `€ ${transaction.unit_price.toFixed(2)}` : '-'}</td>
                <td>${transaction.total_price ? `€ ${transaction.total_price.toFixed(2)}` : '-'}</td>
                <td>
                    <span class="badge ${transaction.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                        ${transaction.status === 'completed' ? 'Complété' : 'En attente'}
                    </span>
                </td>
            `;
            
            transactionsList.appendChild(row);
        });
    }

    // Fonction pour mettre à jour la pagination
    function updatePagination(totalPages, currentPage) {
        pagination.innerHTML = '';
        
        // Bouton précédent
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <button class="page-link" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                Précédent
            </button>
        `;
        pagination.appendChild(prevLi);
        
        // Pages numérotées
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `
                <button class="page-link" data-page="${i}">
                    ${i}
                </button>
            `;
            pagination.appendChild(li);
        }
        
        // Bouton suivant
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <button class="page-link" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                Suivant
            </button>
        `;
        pagination.appendChild(nextLi);
    }

    // Gestionnaire pour les boutons de filtre
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.filter;
            currentPage = 1;
            loadTransactions(currentPage, currentFilter);
        });
    });

    // Gestionnaire pour la pagination
    pagination.addEventListener('click', function(e) {
        if (e.target.matches('[data-page]')) {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page !== currentPage) {
                currentPage = page;
                loadTransactions(currentPage, currentFilter);
            }
        }
    });

    // Initialisation
    loadTransactions(currentPage, currentFilter);
});
