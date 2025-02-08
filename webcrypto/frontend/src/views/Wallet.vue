<template>
	<div class="container mx-auto px-4 py-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-8">Mon Portefeuille</h1>
		<div v-if="wallet" class="bg-white rounded-lg shadow-lg p-6 mb-8">
			<div class="text-2xl font-bold text-gray-900">
				Solde: {{ formatPrice(wallet.balance) }}
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
			<div class="bg-white rounded-lg shadow-lg p-6">
				<h3 class="text-xl font-semibold text-gray-900 mb-4">Demande de Dépôt</h3>
				<form @submit.prevent="requestDeposit" class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Montant</label>
						<input 
							type="number" 
							v-model="depositAmount" 
							placeholder="Montant à déposer"
							min="0"
							step="0.01"
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						/>
					</div>
					<button type="submit" class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
						Demander un Dépôt
					</button>
				</form>
			</div>

			<div class="bg-white rounded-lg shadow-lg p-6">
				<h3 class="text-xl font-semibold text-gray-900 mb-4">Demande de Retrait</h3>
				<form @submit.prevent="requestWithdrawal" class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700">Montant</label>
						<input 
							type="number" 
							v-model="withdrawalAmount" 
							placeholder="Montant à retirer"
							min="0"
							step="0.01"
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						/>
					</div>
					<button type="submit" class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors">
						Demander un Retrait
					</button>
				</form>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<div class="bg-white rounded-lg shadow-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Mes Positions</h2>
				<div v-if="positions.length === 0" class="text-gray-500 text-center py-4">
					Aucune position pour le moment
				</div>
				<template v-else>
					<ul class="divide-y divide-gray-200">
						<li v-for="position in paginatedPositions" :key="position.id" class="py-4">
							<div class="flex justify-between items-center">
								<div>
									<h3 class="text-lg font-medium text-gray-900">{{ position.symbol }}</h3>
									<p class="text-sm text-gray-500">{{ position.name }}</p>
								</div>
								<div class="text-right">
									<p class="text-lg font-medium text-gray-900">{{ formatQuantity(position.quantity) }}</p>
									<p class="text-sm text-gray-500">≈ {{ formatPrice(position.quantity * getCryptoPrice(position.symbol)) }}</p>
								</div>
							</div>
							<div class="mt-2">
								<router-link 
									:to="'/trade/' + position.symbol"
									class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
								>
									Trader
								</router-link>
							</div>
						</li>
					</ul>
					<!-- Pagination pour les positions -->
					<div class="mt-4 flex justify-center space-x-2">
						<button 
							@click="positionsPage--" 
							:disabled="positionsPage === 1"
							class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
						>
							Précédent
						</button>
						<span class="px-3 py-1">
							Page {{ positionsPage }} sur {{ totalPositionsPages }}
						</span>
						<button 
							@click="positionsPage++" 
							:disabled="positionsPage >= totalPositionsPages"
							class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
						>
							Suivant
						</button>
					</div>
				</template>
			</div>

			<div v-if="transactions.length" class="bg-white rounded-lg shadow-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Historique des Transactions</h2>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Date
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Type
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Montant
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Statut
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							<tr v-for="tx in paginatedTransactions" :key="tx.id" class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{{ new Date(tx.created_at).toLocaleString('fr-FR') }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span :class="{
										'px-2 py-1 text-xs font-semibold rounded-full': true,
										'bg-green-100 text-green-800': tx.type === 'DEPOSIT',
										'bg-red-100 text-red-800': tx.type === 'WITHDRAWAL'
									}">
										{{ formatTransactionType(tx.type) }}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium" :class="{
									'text-green-600': tx.type === 'DEPOSIT',
									'text-red-600': tx.type === 'WITHDRAWAL'
								}">
									{{ formatPrice(tx.amount) }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span :class="{
										'px-2 py-1 text-xs font-semibold rounded-full': true,
										'bg-yellow-100 text-yellow-800': tx.status === 'PENDING',
										'bg-green-100 text-green-800': tx.status === 'COMPLETED',
										'bg-red-100 text-red-800': tx.status === 'REJECTED'
									}">
										{{ formatTransactionStatus(tx.status) }}
									</span>
								</td>
							</tr>
						</tbody>
					</table>
					<!-- Pagination pour les transactions -->
					<div class="mt-4 flex justify-center space-x-2">
						<button 
							@click="transactionsPage--" 
							:disabled="transactionsPage === 1"
							class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
						>
							Précédent
						</button>
						<span class="px-3 py-1">
							Page {{ transactionsPage }} sur {{ totalTransactionsPages }}
						</span>
						<button 
							@click="transactionsPage++" 
							:disabled="transactionsPage >= totalTransactionsPages"
							class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
						>
							Suivant
						</button>
					</div>
				</div>
			</div>

			<div v-if="cryptoTransactions.length" class="bg-white rounded-lg shadow-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Historique des Transactions Crypto</h2>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Date
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Type
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Crypto
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Quantité
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Prix unitaire
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Total
								</th>
								<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Commission
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							<tr v-for="tx in paginatedCryptoTransactions" :key="tx.id" class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{{ new Date(tx.created_at).toLocaleString('fr-FR') }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span :class="{
										'px-2 py-1 text-xs font-semibold rounded-full': true,
										'bg-green-100 text-green-800': tx.transaction_type === 'BUY',
										'bg-red-100 text-red-800': tx.transaction_type === 'SELL'
									}">
										{{ formatTransactionType(tx.transaction_type) }}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{{ tx.symbol }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{{ formatQuantity(tx.quantity) }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{{ formatPrice(tx.price_per_unit) }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{{ formatPrice(tx.total_amount) }}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{{ formatPrice(tx.fee_amount) }}
									<span class="text-xs text-gray-400 ml-1">
										({{ calculateCommissionPercentage(tx) }}%)
									</span>
								</td>
							</tr>
						</tbody>
					</table>
					<!-- Pagination pour les transactions crypto -->
					<div class="mt-4 flex justify-center space-x-2">
						<button 
							@click="cryptoTransactionsPage--" 
							:disabled="cryptoTransactionsPage === 1"
							class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
						>
							Précédent
						</button>
						<span class="px-3 py-1">
							Page {{ cryptoTransactionsPage }} sur {{ totalCryptoTransactionsPages }}
						</span>
						<button 
							@click="cryptoTransactionsPage++" 
							:disabled="cryptoTransactionsPage >= totalCryptoTransactionsPages"
							class="px-3 py-1 rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
						>
							Suivant
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { socket } from '@/socket';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
	name: 'Wallet',
	setup() {
		const store = useStore();
		const router = useRouter();
		const wallet = ref(null);
		const positions = ref([]);
		const transactions = ref([]);
		const depositAmount = ref('');
		const withdrawalAmount = ref('');
		const cryptoPrices = ref({});
		const cryptoTransactions = ref([]);

		// Pagination
		const itemsPerPage = 5;
		const positionsPage = ref(1);
		const transactionsPage = ref(1);
		const cryptoTransactionsPage = ref(1);

		// Computed properties for pagination
		const totalPositionsPages = computed(() => Math.ceil(positions.value.length / itemsPerPage));
		const totalTransactionsPages = computed(() => Math.ceil(transactions.value.length / itemsPerPage));
		const totalCryptoTransactionsPages = computed(() => Math.ceil(cryptoTransactions.value.length / itemsPerPage));

		const paginatedPositions = computed(() => {
			const start = (positionsPage.value - 1) * itemsPerPage;
			const end = start + itemsPerPage;
			return positions.value.slice(start, end);
		});

		const paginatedTransactions = computed(() => {
			const start = (transactionsPage.value - 1) * itemsPerPage;
			const end = start + itemsPerPage;
			return transactions.value.slice(start, end);
		});

		const paginatedCryptoTransactions = computed(() => {
			const start = (cryptoTransactionsPage.value - 1) * itemsPerPage;
			const end = start + itemsPerPage;
			return cryptoTransactions.value.slice(start, end);
		});

		const formatPrice = (price) => {
			if (typeof price !== 'number') return '$0.00';
			return new Intl.NumberFormat('fr-FR', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(price);
		};

		const formatQuantity = (quantity) => {
			if (typeof quantity !== 'number') return '0';
			return new Intl.NumberFormat('fr-FR', {
				minimumFractionDigits: 6,
				maximumFractionDigits: 6
			}).format(quantity);
		};

		const getCryptoPrice = (symbol) => {
			return cryptoPrices.value[symbol] || 0;
		};

		const requestDeposit = async () => {
			try {
				socket.emit('requestDeposit', {
					type: 'DEPOSIT',
					amount: parseFloat(depositAmount.value),
					status: 'PENDING'
				});
				depositAmount.value = '';
			} catch (error) {
				console.error('Error requesting deposit:', error);
				alert('Échec de la demande de dépôt');
			}
		};

		const requestWithdrawal = async () => {
			try {
				socket.emit('requestWithdrawal', {
					type: 'WITHDRAWAL',
					amount: parseFloat(withdrawalAmount.value),
					status: 'PENDING'
				});
				withdrawalAmount.value = '';
			} catch (error) {
				console.error('Error requesting withdrawal:', error);
				alert('Échec de la demande de retrait');
			}
		};

		const formatTransactionType = (type) => {
			switch (type) {
				case 'DEPOSIT':
					return 'Dépôt';
				case 'WITHDRAWAL':
					return 'Retrait';
				default:
					return type;
			}
		};

		const formatTransactionStatus = (status) => {
			switch (status) {
				case 'PENDING':
					return 'En attente';
				case 'COMPLETED':
					return 'Complété';
				case 'REJECTED':
					return 'Rejeté';
				default:
					return status;
			}
		};

		const calculateCommissionPercentage = (tx) => {
			if (!tx.total_amount || !tx.fee_amount) return '0.00';
			const percentage = (tx.fee_amount / tx.total_amount) * 100;
			return percentage.toFixed(2);
		};

		onMounted(() => {
			socket.connect();

			// Authentifier le socket avec le token
			const token = localStorage.getItem('token') || localStorage.getItem('sessionToken') || localStorage.getItem('access_token');
			console.log('Token utilisé pour l\'authentification:', token);
			
			if (token) {
				socket.emit('authenticate', token);
			} else {
				console.error('Aucun token trouvé dans le localStorage');
				alert('Erreur d\'authentification: veuillez vous reconnecter');
				router.push('/login');
				return;
			}

			// Écouter les mises à jour
			socket.on('authenticated', () => {
				console.log('Socket authentifié avec succès');
				// Demander les données initiales après l'authentification
				socket.emit('getWallet');
				socket.emit('getPositions');
				socket.emit('getTransactions');
				socket.emit('getCryptoTransactions');
			});

			socket.on('walletUpdate', (data) => {
				console.log('Mise à jour du portefeuille reçue:', data);
				wallet.value = {
					...data,
					balance: parseFloat(data.balance) || 0
				};
			});

			socket.on('positionsUpdate', (data) => {
				console.log('Mise à jour des positions reçue:', data);
				positions.value = data.map(pos => ({
					...pos,
					quantity: parseFloat(pos.quantity),
					average_buy_price: parseFloat(pos.average_buy_price),
					total_invested: parseFloat(pos.total_invested)
				}));
			});

			socket.on('transactionsUpdate', (data) => {
				console.log('Mise à jour des transactions reçue:', data);
				transactions.value = data.map(tx => ({
					...tx,
					amount: parseFloat(tx.amount),
					quantity: parseFloat(tx.quantity),
					price: parseFloat(tx.price),
					created_at: new Date(tx.created_at)
				}));
			});

			socket.on('priceUpdate', (data) => {
				cryptoPrices.value = data.reduce((acc, crypto) => {
					acc[crypto.symbol] = crypto.price;
					return acc;
				}, {});
			});

			socket.on('cryptoTransactionsUpdate', (data) => {
				console.log('Mise à jour des transactions crypto reçue:', data);
				cryptoTransactions.value = data.map(tx => ({
					...tx,
					quantity: parseFloat(tx.quantity),
					price_per_unit: parseFloat(tx.price_per_unit),
					total_amount: parseFloat(tx.total_amount),
					fee_amount: parseFloat(tx.fee_amount),
					created_at: new Date(tx.created_at)
				}));
			});

			// Écouter les réponses aux demandes
			socket.on('depositResponse', (response) => {
				if (response.success) {
					alert('Demande de dépôt envoyée pour approbation');
				} else {
					alert(response.message || 'Échec de la demande de dépôt');
				}
			});

			socket.on('withdrawalResponse', (response) => {
				if (response.success) {
					alert('Demande de retrait envoyée pour approbation');
				} else {
					alert(response.message || 'Échec de la demande de retrait');
				}
			});

			socket.on('error', (error) => {
				console.error('Erreur socket:', error);
				if (error.message.includes('authentification')) {
					alert('Erreur d\'authentification: veuillez vous reconnecter');
					router.push('/login');
				} else {
					alert(error.message || 'Erreur de connexion au serveur');
				}
			});
		});

		onUnmounted(() => {
			socket.off('walletUpdate');
			socket.off('positionsUpdate');
			socket.off('transactionsUpdate');
			socket.off('priceUpdate');
			socket.off('depositResponse');
			socket.off('withdrawalResponse');
			socket.off('requestProcessed');
			socket.disconnect();
		});

		return {
			wallet,
			positions,
			transactions,
			depositAmount,
			withdrawalAmount,
			requestDeposit,
			requestWithdrawal,
			formatPrice,
			formatQuantity,
			getCryptoPrice,
			formatTransactionType,
			formatTransactionStatus,
			// Pagination
			positionsPage,
			transactionsPage,
			totalPositionsPages,
			totalTransactionsPages,
			paginatedPositions,
			paginatedTransactions,
			cryptoTransactions,
			cryptoTransactionsPage,
			totalCryptoTransactionsPages,
			paginatedCryptoTransactions,
			calculateCommissionPercentage,
		};
	}
};
</script>

<style scoped>
.wallet {
	padding: 20px;
}

.wallet-info {
	margin: 20px 0;
	padding: 15px;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.transaction-forms {
	display: flex;
	gap: 20px;
	margin: 20px 0;
}

.deposit-form, .withdrawal-form {
	flex: 1;
	padding: 15px;
	border: 1px solid #ddd;
	border-radius: 4px;
}

form {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

input {
	padding: 8px;
	border: 1px solid #ddd;
	border-radius: 4px;
}

button {
	padding: 8px;
	background-color: #4CAF50;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

button:hover {
	background-color: #45a049;
}

.positions, .transactions {
	margin-top: 20px;
}

ul {
	list-style: none;
	padding: 0;
}

li {
	padding: 10px;
	border-bottom: 1px solid #eee;
}

li:last-child {
	border-bottom: none;
}
</style>