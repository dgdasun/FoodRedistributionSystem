# Product monitoring & expiry detection, bulk upload, expiry threshold configuration, automated classification

## Modules in this part
- Product monitoring and expiry detection
- Bulk data upload (CSV)
- Expiry threshold configuration (admin settings)
- Automated classification (fresh / surplus / expired, category rules)

## Note
Bulk CSV upload and reclassifyAll() are methods inside DonationService.java, which is in Part 6 (the listing owner). Part 5 owns those two methods + ExpiryUtil + Settings; Part 6 owns the rest of that class. Because they edit different methods, git merges them cleanly. SettingsController calls DonationService.reclassifyAll(), and DonationService calls SettingsService, so Parts 5 and 6 depend on each other: merge them back-to-back.

## Needs code from other parts (for compile / run)
- 04_UserMgmt_RBAC_Approval: AuthContext.jsx
- 06_Listing_Categorization_RealtimeStock: DonationService

## How to add this part to the repo (run inside your clone of the repo)

Windows (CMD/PowerShell):  `robocopy <unzipped-folder> . /E /XF PART_README.md`
Mac/Linux/Git Bash:        `rsync -av --exclude PART_README.md <unzipped-folder>/ ./`

## Files (8)
- backend-spring/src/main/java/com/foodshare/controller/SettingsController.java
- backend-spring/src/main/java/com/foodshare/model/Settings.java
- backend-spring/src/main/java/com/foodshare/repository/SettingsRepository.java
- backend-spring/src/main/java/com/foodshare/service/SettingsService.java
- backend-spring/src/main/java/com/foodshare/util/ExpiryUtil.java
- frontend/src/components/DonationTimeline.jsx
- frontend/src/pages/AdminSettings.jsx
- frontend/src/pages/MyDonations.jsx
