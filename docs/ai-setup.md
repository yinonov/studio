# AI Setup Instructions (Currently Disabled)

⚠️ **AI Features Status: DISABLED**

AI features including contract clause customization are currently disabled in this project. The AI-related code has been removed to simplify the codebase and eliminate dependency on external AI services.

## Future AI Features

When AI features are re-enabled in the future, they will include:
- AI-powered contract clause customization
- Intelligent contract suggestions  
- Automated legal text generation

## Re-enabling AI Features

If you want to re-enable AI features in the future:

### Step 1: Get Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 2: Add API Key to Environment

1. Open your `.env.local` file
2. Uncomment and set the API key:
   ```
   GOOGLE_GENAI_API_KEY=your_actual_api_key_here
   ```

### Step 3: Start Genkit Development Server

Run the following command to start the Genkit development server:

```bash
npm run genkit:dev
```

This will start the Genkit management interface where you can:
- Test AI flows
- Monitor model usage
- Debug AI responses
- Manage model configurations

### Step 4: Access Model Management

Once the API key is configured and the server is running:
1. The "Manage Models" feature should work without errors
2. You can access it through the Genkit dev UI (usually at http://localhost:4000)
3. Or through any AI features in your application

### Available AI Features

Currently configured:
- **Model**: Google Gemini 2.0 Flash
- **Flow**: Contract clause customization (`customize-contract-clause`)

### Troubleshooting

If you still see "Invalid API Key" errors:

1. **Check API Key**: Ensure the key is correctly set in `.env.local`
2. **Restart Server**: Restart your development server after adding the key
3. **Verify Permissions**: Make sure the API key has the necessary permissions
4. **Check Quotas**: Verify you haven't exceeded any usage limits

### Production Deployment

For production, make sure to:
1. Add the API key to Firebase Secret Manager
2. Update the `apphosting.yaml` configuration
3. The key is already configured to use `google-genai-api-key` secret

### Running AI in Development

```bash
# Start the main app
npm run dev

# In another terminal, start Genkit
npm run genkit:dev

# Or start with auto-reload
npm run genkit:watch
```

The Genkit interface will be available at http://localhost:4000 when running.
