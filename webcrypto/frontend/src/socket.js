import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
	autoConnect: false,
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 5000,
	reconnectionAttempts: 5
});

// Handle authentication
socket.on('connect', () => {
	console.log('Connected to server');
	const sessionToken = localStorage.getItem('sessionToken');
	if (sessionToken) {
		socket.emit('authenticate', sessionToken);
	}
});

socket.on('disconnect', () => {
	console.log('Disconnected from server');
});

socket.on('error', (error) => {
	console.error('Socket error:', error);
});

export { socket };