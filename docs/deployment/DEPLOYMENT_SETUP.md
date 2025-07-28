# Firebase Deployment Setup

This document explains how to set up the GitHub Actions deployment workflow for your Firebase project.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### 1. FIREBASE_TOKEN

This is your Firebase CI token for authentication.

**To get this token:**

```bash
firebase login:ci
```

Copy the token that's generated and add it as a secret named `FIREBASE_TOKEN`.

### 2. FIREBASE_PROJECT_ID

Your Firebase project ID (e.g., `your-project-name`).

**To find your project ID:**

```bash
firebase projects:list
```

Or check your Firebase console URL: `https://console.firebase.google.com/project/[PROJECT_ID]`

### 3. FIREBASE_SERVICE_ACCOUNT_BASE64 (Optional)

Base64-encoded service account key for more secure authentication.

**To create and encode a service account:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to IAM & Admin → Service Accounts
4. Create a new service account or use an existing one
5. Generate a JSON key
6. Encode it to base64:

   ```bash
   base64 -i path/to/service-account.json
   ```

7. Add the base64 string as `FIREBASE_SERVICE_ACCOUNT_BASE64` secret

## Alternative: Using Firebase Token Only

If you prefer to use only the Firebase token (simpler setup), you can modify the deployment workflow to remove the service account authentication steps and use only the `FIREBASE_TOKEN`.

## What the Workflow Does

### Test Job

1. **Lints and builds** Cloud Functions
2. **Runs unit tests** for the application
3. **Builds the Next.js app**
4. **Runs E2E tests** including Hebrew text rendering verification
5. **Uploads test artifacts** if tests fail

### Deploy Job (only on master branch)

1. **Rebuilds** the application and functions
2. **Authenticates** with Firebase
3. **Deploys to Firebase App Hosting** (smart-contracts-web-app backend)
4. **Deploys Cloud Functions**
5. **Updates Firestore rules and indexes**
6. **Updates Storage rules**
7. **Provides deployment status feedback**

## Manual Deployment

You can also trigger deployments manually:

- Go to your repository → Actions → Deploy to Firebase → Run workflow

## Local Testing

Before pushing to master, you can test locally:

```bash
# Run all tests
npm run test:all

# Build everything
npm run build
cd functions && npm run build

# Deploy manually (if needed)
cd functions && npm run deploy
```

## Troubleshooting

### Common Issues

1. **Authentication failures**: Ensure your `FIREBASE_TOKEN` is valid and hasn't expired
2. **Permission errors**: Make sure your Firebase project has the necessary APIs enabled:
   - Cloud Functions API
   - Cloud Run API (for App Hosting)
   - Cloud Build API
3. **Build failures**: Check that all dependencies are properly installed and TypeScript compiles without errors

### Getting Help

1. Check the Actions tab in GitHub for detailed logs
2. Verify your Firebase project configuration with `firebase use --list`
3. Test local deployment first with `firebase deploy --dry-run`
