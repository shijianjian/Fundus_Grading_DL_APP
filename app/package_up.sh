#!/bin/bash
cd ./frontend
npm i
npm run build
cd ..
mkdir packaging
cp -r ./frontend/dist/* ./packaging
cp ./backend/*.py ./packaging
cp -r ./backend/fundus_samples ./packaging
cp -r ./backend/models ./packaging
