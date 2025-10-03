@echo off

echo Installing Vue CLI globally...
call npm install -g @vue/cli

echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo Installing backend dependencies...
cd backend
call npm install
cd ..

echo All dependencies installed!
