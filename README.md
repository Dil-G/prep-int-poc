# JSON Parser & Viewer

A simple, modern React application for sending JSON to an API and visualizing the response with a beautiful user interface.

## Features

- **Send Requests**: Enter an API URL, choose a method, add headers, and send
- **JSON Body**: Paste any valid JSON as the request body (non-GET/HEAD)
- **Response Viewer**: Auto-detects JSON vs text; expandable JSON view
- **Status & Timing**: Shows HTTP status and request duration
- **Error Handling**: Clear messages for invalid JSON and network/CORS issues
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd json-parser-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## How to Use

1. **API URL**: Enter the target endpoint (e.g., `https://api.example.com/endpoint`)
2. **Method**: Select GET, POST, PUT, PATCH, DELETE, or HEAD
3. **Headers (JSON)**: Optional. Provide a JSON object (e.g., `{ "Authorization": "Bearer token" }`)
4. **Request Body (JSON)**: For non-GET/HEAD methods, paste your JSON body
5. **Send**: Click "Send Request" to execute the call
6. **View Response**: Right panel shows status, time, and response body
   - If `Content-Type` contains `application/json`, you'll get an interactive JSON viewer
   - Otherwise, the body renders as plain text

## CORS Notes

From a browser, requests are subject to CORS. If you encounter a CORS error:

- The API must include appropriate `Access-Control-Allow-Origin` headers for your origin
- For development, use a proxy or run your own backend relay to call the API server-side
- Check the browser console for detailed CORS messages

## Sample Data

A sample JSON file (`sample-data.json`) is included in the project root; you can copy from it to test request bodies.

## Building for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build` folder.

## Technologies Used

- **React 18**: Modern React with hooks
- **CSS3**: Custom styling with gradients and animations
- **JavaScript ES6+**: Modern JavaScript features

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is open source and available under the MIT License. 