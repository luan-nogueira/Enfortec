@echo off
cd /d C:\Users\Luanm\.gemini\Enfortec
git add .
git commit -m "fix: encode coupon code in base64 in orderNsu to prevent _ in coupon from corrupting NSU parse"
git push
