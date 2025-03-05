# Socket Friends - Chrome Extension

This is the frontend component of the Socket Friends project, which enables real-time collaborative cursor interaction between users on the new tab page.

## Features

- Real-time cursor tracking and rendering
- Custom new tab page with search functionality
- User identification and customization
- WebSocket communication with the backend server

## Installation

### Development Mode

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `extension` directory
5. The extension should now be installed and active

### Production Mode

1. Create a ZIP file of the `extension` directory
2. Upload to the Chrome Web Store (requires developer account)

## Usage

1. Make sure the backend server is running
2. Open a new tab in Chrome
3. You should see the Socket Friends new tab page
4. Move your cursor around to see it shared with other users
5. Access options by clicking the "Options" link at the bottom of the page

## Configuration

You can customize the following settings in the options page:

- **Username**: The name displayed to other users
- **Cursor Color**: The color of your cursor
- **Server URL**: The WebSocket server address (default: http://localhost:3000)

## Project Structure

```
extension/
├── manifest.json       # Chrome extension manifest
├── background.js       # Background script
├── newtab/             # Custom new tab page
│   ├── newtab.html
│   ├── newtab.css
│   └── newtab.js
├── options/            # Extension options page
│   ├── options.html
│   ├── options.css
│   └── options.js
└── assets/             # Icons and images
```

## Development

To modify the extension:

1. Edit the files in the appropriate directories
2. Reload the extension in Chrome by clicking the refresh icon on the extensions page
3. Open a new tab to see your changes

## License

ISC 