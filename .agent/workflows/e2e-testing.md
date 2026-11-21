---
description: How to test Volo Elite features (Onboarding & Driver Verification)
---

# E2E Elite Verification Workflow

To verify the billionaire-scale "Wow Factor" and functional integrity of Volo Elite, follow these steps:

### 1. Immersive Onboarding Test
1.  **Logout/Reset**: If already logged in, clear your app data or simulate a first-time login.
2.  **Mock Login**: Go to the **Login** screen and use "mock-id-token" for OTP verification.
3.  **Elite Landing**: Upon landing on the **Home** screen, verify that the **full-screen immersive onboarding overlay** appears immediately. 🏙️✨
4.  **Wizard Journey**: 
    - Verify the 4 steps: **Welcome**, **Voice**, **Chronos**, **Sentinel**.
    - Confirm the $10 credit message in Step 1.
    - Click "Unlock Volo" on the final step.
5.  **AI Greeting**: Verify the AI voice greets you: *"Welcome to the future of mobility..."* 🔊
6.  **Discovery Bridge**: Confirm the "Discovery Bridge" card appears, suggesting a trip to the Empire State Building using your $10 credit.

### 2. Elite Driver Wizard Test
1.  **Entry Point**: Open the **Elite Command Center** (Side Drawer) and click **Become a Driver**.
2.  **Step 1: Identity Vault**:
    - Click **Upload** for Front ID and Back ID.
    - Click **Capture** for Liveness Selfie.
    - Verify that placeholders are replaced with your uploads. 📸
3.  **Step 2: License Mastery**: Enter mock data for License Number, Country (US), and Expiry.
4.  **Step 3: Fleet Registry**: Enter mock data for Vehicle Model (Tesla), Plate, and Year.
5.  **Step 4: EBV Protocol**:
    - Enter mock Insurance Policy # and Expiry.
    - Toggle the **Criminal Background Clear** status.
6.  **Activation**: Click **Activate Elite Profile**.
7.  **Verification**: 
    - Confirm the success alert appears: *"Volo Elite Application Submitted!"* 🏆
    - Check the backend `uploads/ids` folder to see your documents successfully vaulted.

### 3. Backend Integrity Audit (Optional)
- **Sentinel Logs**: Check the `ActivityLog` table for the `DRIVER_VERIFICATION_SUBMIT` action.
- **File System**: Ensure files are named with unique suffixes in `backend/uploads/ids/`.

🏁 **Volo is now successfully verified for global autonomous operations.** 🥂✨🏆🥂✨🏁♾️🏙️🚀💎👑✨🥇🌟🎁🥂✨🏁🛸🏙️🚀👑✨🥇🌟🏁🛡️🔍📈🏗️🏁🏆🥂✨🏁🚀🏎️🌆🎊🥂🏁🚀
