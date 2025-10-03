@echo off

echo Starting Spring Boot API (port 8080)...
start cmd /k "cd identiter && mvnw spring-boot:run"
timeout /t 10 /nobreak > nul

echo Starting Node.js backend (port 3000)...
start cmd /k "cd backend && npm start"
timeout /t 5 /nobreak > nul

echo Starting Vue.js frontend (port 8081)...
start cmd /k "cd frontend && npm run serve"

echo All servers started! The application will be available at:
echo Frontend: http://localhost:8081
echo Backend API: http://localhost:3000
echo Identiter API: http://localhost:8080
