# Hermium CLI

Self-hosted AI chat dashboard for Hermes Agent.

## Install

```bash
npm install -g hermium
```

Or with Bun:

```bash
bun install -g hermium
```

## Requirements

- [Bun](https://bun.sh) >= 1.2

## Commands

```bash
hermium start          # Start the server (daemon)
hermium stop             # Stop the server
hermium restart          # Restart the server
hermium status           # Show running status
hermium build            # Build from source (requires repo)
hermium dev              # Run in dev mode (requires repo)
hermium help             # Show help
hermium version          # Show version
```

## Options

```bash
hermium start --port 47474    # Custom port (default: 47474)
```

## Development

To run from source:

```bash
git clone https://github.com/abboskhonov/hermium.git
cd hermium
bun install
bun run dev
```

To build the CLI package for publishing:

```bash
cd packages/cli
bun run build
```
