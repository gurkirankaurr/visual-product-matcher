# Visual Product Matcher — Client

React frontend built with Vite. Talks to the Express backend for image analysis and product search.

## Running locally

```bash
# create .env first
echo "VITE_API_URL=http://localhost:5000" > .env

npm install
npm run dev
```

Opens on `http://localhost:5173`. Make sure the backend is running first.

## Build for production

```bash
npm run build
# output goes to dist/
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the backend server |

For deployment, this gets set in Vercel's environment settings. See the root `DEPLOYMENT.md`.