# Deploying Socket Friends Backend to Render

This document provides instructions for deploying the Socket Friends backend to Render.

## Prerequisites

- A Render account (sign up at [render.com](https://render.com))
- Your code pushed to a GitHub repository

## Deployment Steps

1. **Sign in to Render**
   - Go to [dashboard.render.com](https://dashboard.render.com) and sign in

2. **Create a New Web Service**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your Socket Friends backend

3. **Configure the Service**
   - **Name**: `socket-friends` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Advanced Options**
   - No need to change anything here for basic deployment

5. **Create Web Service**
   - Click "Create Web Service" to start the deployment

6. **Update Your Extension**
   - Once deployed, update the `serverUrl` in `extension/newtab/newtab.js`:
   ```javascript
   let serverUrl = 'https://socket-friend-b0t7.onrender.com'; // Your deployed Render URL
   ```

7. **Reload Your Extension**
   - Go to `chrome://extensions/`
   - Find Socket Friends and click the refresh icon

## Troubleshooting

- **Connection Issues**: Check the CORS settings in `server.js`
- **Deployment Failures**: Check the Render logs for details
- **Extension Not Connecting**: Verify the URL and permissions in `manifest.json`

## Free Tier Limitations

Note that Render's free tier will spin down your service after 15 minutes of inactivity. When a new request comes in, it will spin up again (which takes about 30 seconds). 