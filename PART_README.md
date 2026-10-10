# Shared base / project skeleton (team leader)

## Modules in this part
- Project skeleton every member needs: build files, config, shared UI, routing, theme

## Note
Commit this FIRST (leader) to `develop`. It contains no module code, so it does not depend on any other part.

## Needs code from other parts (for compile / run)
- none (only the shared base)

## How to add this part to the repo (run inside your clone of the repo)

Windows (CMD/PowerShell):  `robocopy <unzipped-folder> . /E /XF PART_README.md`
Mac/Linux/Git Bash:        `rsync -av --exclude PART_README.md <unzipped-folder>/ ./`

## Files (56)
- .gitignore
- ARCHITECTURE.md
- README.md
- backend-spring/Dockerfile
- backend-spring/pom.xml
- backend-spring/src/main/java/com/foodshare/FoodshareApplication.java
- backend-spring/src/main/java/com/foodshare/config/CorsConfig.java
- backend-spring/src/main/java/com/foodshare/config/GlobalExceptionHandler.java
- backend-spring/src/main/java/com/foodshare/controller/HealthController.java
- backend-spring/src/main/java/com/foodshare/dto/ApiError.java
- backend-spring/src/main/resources/application.yml
- docker-compose.yml
- frontend/Dockerfile
- frontend/index.html
- frontend/nginx.conf
- frontend/package-lock.json
- frontend/package.json
- frontend/postcss.config.js
- frontend/public/auth-hero.jpg
- frontend/public/favicon.png
- frontend/public/logo-white.png
- frontend/public/logo.jpg
- frontend/public/logo.png
- frontend/public/sample_inventory.csv
- frontend/public/title@3x.png
- frontend/public/zero-waste-logo.jpg
- frontend/public/zero-waste-logo.png
- frontend/public/zero-waste-logo.svg
- frontend/src/ThemeContext.jsx
- frontend/src/api.js
- frontend/src/assets/logo-white.png
- frontend/src/assets/logo.png
- frontend/src/components/Footer.jsx
- frontend/src/components/Icons.jsx
- frontend/src/components/LiveBadge.jsx
- frontend/src/components/LottieState.jsx
- frontend/src/components/Pagination.jsx
- frontend/src/components/ProgressRing.jsx
- frontend/src/components/Reveal.jsx
- frontend/src/components/Section.jsx
- frontend/src/components/Skeleton.jsx
- frontend/src/components/StatCard.jsx
- frontend/src/components/SuccessBurst.jsx
- frontend/src/components/ThemeToggle.jsx
- frontend/src/components/Toast.jsx
- frontend/src/components/charts/ChartKit.jsx
- frontend/src/components/motion/Motion.jsx
- frontend/src/hooks/useLiveData.js
- frontend/src/index.css
- frontend/src/lottie/empty-basket.json
- frontend/src/lottie/success-check.json
- frontend/src/pages/Help.jsx
- frontend/src/timeAgo.js
- frontend/tailwind.config.js
- frontend/vite.config.js
- sample-data/sample_inventory.csv
