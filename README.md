# SR Podfeed

A Cloudflare Worker that generates podcast RSS feeds from Sveriges Radio (Swedish Radio) programs. This service allows you to subscribe to Swedish Radio programs in your favorite podcast app by providing properly formatted RSS feeds.

## What it does

SR Podfeed fetches program data from Sveriges Radio's API and generates standard podcast RSS feeds that are compatible with all major podcast apps (Apple Podcasts, Spotify, Google Podcasts, etc.). It provides:

- **RSS Feed Generation**: Converts SR program data into podcast-compatible RSS feeds
- **Web Interface**: A searchable web interface to browse all available programs
- **Multiple Feed Types**: Support for both download and broadcast feeds
- **Category Mapping**: Maps Swedish Radio categories to iTunes podcast categories
- **Real-time Data**: Always fetches the latest episodes from SR's API

## Features

- 🎧 **Podcast RSS Feeds**: Generate standard RSS feeds for any SR program
- 🔍 **Search Interface**: Browse and search through all available programs
- 📱 **Mobile Responsive**: Works great on desktop and mobile devices
- 🏷️ **Category Support**: Proper iTunes category mapping for better discoverability
- ⚡ **Fast**: Built on Cloudflare Workers for global performance
- 🔄 **Real-time**: Always up-to-date with the latest episodes

## How to use

### Web Interface

Visit the deployed service to browse all available programs:

1. Use the search box to find specific programs
2. Filter by program type (podcast/broadcast)
3. Click the RSS feed links to subscribe in your podcast app

## Running locally

### Prerequisites

- Node.js 18+
- Yarn package manager
- Cloudflare account (for deployment)

### Installation

1. Clone the repository.

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

The service will be available at `http://localhost:8787`

### Available Scripts

- `yarn dev` - Start development server
- `yarn start` - Alias for dev command
- `yarn deploy` - Deploy to Cloudflare Workers

## Deployment

### Deploy to Cloudflare Workers

1. Make sure you have Wrangler CLI installed:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy the worker:
```bash
yarn deploy
```

The worker will be deployed to your Cloudflare account and you'll get a URL like `https://sr-podfeed.your-subdomain.workers.dev`

### Environment Configuration

The project uses Cloudflare Workers and doesn't require any environment variables for basic functionality. All configuration is handled in `wrangler.jsonc`.

### Data Sources

The service fetches data from Sveriges Radio's public API.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source. Please check the license file for details.

## Acknowledgments

- Sveriges Radio for providing the public API
- Cloudflare for the Workers platform
- The podcast community for RSS feed standards

## Support further development

If you find this project useful and want to support further development, you can buy me a coffee.
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-violet.png)](https://www.buymeacoffee.com/rasmus)
