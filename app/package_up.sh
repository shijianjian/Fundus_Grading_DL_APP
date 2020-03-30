#!/bin/bash
cd ./frontend
npm run build
cd ..
mkdir packaging
cp -r ./frontend/dist/* ./packaging
cp ./backend/*.py ./packaging
cp -r ./backend/fundus_samples ./packaging
cp -r ./backend/models ./packaging
cd ./packaging
python3 webview_index.py
