# Near-expiry & expired food listing and redistribution, categorization & display, real-time stock update

## Modules in this part
- Near-expiry / expired food listing and redistribution
- Product categorization and display
- Real-time stock update (live polling)

## Note
Owns Donation model/repo/controller/service (listing, publish, status, pickup). Real-time stock update = useLiveData polling (in Shared Base) used by BrowseFood.jsx. See Part 5 note about sharing DonationService.java.

## Needs code from other parts (for compile / run)
- 04_UserMgmt_RBAC_Approval: AuthContext.jsx, User, UserRepository
- 05_Monitoring_BulkUpload_Thresholds_Classification: ExpiryUtil, SettingsService

## How to add this part to the repo (run inside your clone of the repo)

Windows (CMD/PowerShell):  `robocopy <unzipped-folder> . /E /XF PART_README.md`
Mac/Linux/Git Bash:        `rsync -av --exclude PART_README.md <unzipped-folder>/ ./`

## Files (8)
- backend-spring/src/main/java/com/foodshare/controller/DonationController.java
- backend-spring/src/main/java/com/foodshare/model/Donation.java
- backend-spring/src/main/java/com/foodshare/repository/DonationRepository.java
- backend-spring/src/main/java/com/foodshare/service/DonationService.java
- frontend/src/components/FoodMap.jsx
- frontend/src/components/FreshnessMeter.jsx
- frontend/src/geo.js
- frontend/src/pages/BrowseFood.jsx
