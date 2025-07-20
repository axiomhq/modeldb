# Contributing to ModelDB

First off, thank you for considering contributing to ModelDB! It's people like you that make ModelDB such a great tool for the AI community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guide](#style-guide)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful** - Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be collaborative** - Work together to solve problems and help each other learn.
- **Be inclusive** - Welcome newcomers and help them get started.
- **Be constructive** - Provide helpful feedback and accept criticism gracefully.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Cloudflare account (free tier works!)
- Basic TypeScript knowledge

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/modeldb.git
   cd modeldb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

## How Can I Contribute?

### Reporting Bugs

Found a bug? Help us fix it!

1. **Check existing issues** - Someone might have already reported it
2. **Create a detailed bug report** including:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

### Suggesting Features

Have an idea to make ModelDB better?

1. **Check the roadmap** - It might already be planned
2. **Open a feature request** with:
   - Clear use case
   - Proposed solution
   - Alternative solutions considered
   - Any mockups or examples

### Your First Code Contribution

New to the project? Look for issues tagged with:
- `good first issue` - Simple fixes to get you started
- `help wanted` - We need your expertise!
- `documentation` - Help improve our docs

### Pull Requests

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Add tests for new functionality
   - Update documentation as needed

3. **Ensure quality**
   ```bash
   # Run linter
   npm run lint
   
   # Run all tests
   npm test
   
   # Test your changes locally
   npm run dev
   ```

4. **Submit your PR**
   - Reference any related issues
   - Describe your changes clearly
   - Include screenshots for UI changes
   - Be patient and responsive to feedback

## Development Process

### Project Structure

```
modeldb/
├── src/
│   ├── data/          # Generated model data
│   ├── routes/        # API endpoints
│   ├── schema.ts      # Data schemas
│   └── index.ts       # Main entry point
├── scripts/
│   └── sync.ts        # Data sync script
├── tests/             # Test files
└── wrangler.toml      # Cloudflare config
```

### Key Concepts

1. **Data Generation**
   - Model data is fetched from LiteLLM and compiled at build time
   - Run `npm run sync` to update model data
   - Generated files in `src/data/` should be committed

2. **Schema-First Design**
   - All data structures defined with Zod schemas
   - OpenAPI spec auto-generated from schemas
   - Type safety throughout the codebase

3. **Edge-First Architecture**
   - Optimized for Cloudflare Workers constraints
   - No external API calls at runtime
   - All data served from memory

### Common Tasks

#### Adding a New API Endpoint

1. Create route file in `src/routes/`
2. Define request/response schemas
3. Implement handler logic
4. Add tests in `tests/`
5. Update OpenAPI documentation

#### Adding Model Fields

1. Update `Model` schema in `src/schema.ts`
2. Modify sync script in `scripts/sync.ts`
3. Run `npm run sync` to regenerate data
4. Update affected endpoints
5. Add tests for new fields

#### Improving Performance

1. Profile with Cloudflare's debugging tools
2. Minimize response sizes
3. Optimize data structures for access patterns
4. Consider caching strategies

## Style Guide

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add types, avoid `any`

### Code Formatting

We use Biome for consistent formatting:
```bash
npm run lint
```

### Commit Messages

Follow conventional commits:
```
feat: add model deprecation warnings
fix: correct provider ID normalization
docs: update API examples
test: add provider filtering tests
```

### Testing

- Write tests for all new features
- Aim for high coverage but focus on critical paths
- Use descriptive test names
- Test edge cases and error conditions

Example:
```typescript
describe('Model filtering', () => {
  it('should filter models by multiple providers', async () => {
    // Test implementation
  });
  
  it('should handle invalid provider gracefully', async () => {
    // Test implementation
  });
});
```

## Community

### Getting Help

- **GitHub Discussions** - Ask questions and share ideas
- **Issue Tracker** - Report bugs and request features
- **Email** - [maintainer@example.com](mailto:maintainer@example.com)

### Recognition

Contributors are recognized in:
- The README contributors section
- Release notes
- Our hearts

### Release Process

1. Contributors submit PRs
2. Maintainers review and merge
3. Changes deployed to development
4. Testing in production-like environment
5. Release to production
6. Update changelog

## Tips for Success

1. **Start small** - Your first PR doesn't need to be huge
2. **Ask questions** - We're here to help
3. **Be patient** - Reviews take time but we appreciate your work
4. **Have fun** - Open source should be enjoyable!

---

Thank you for contributing to ModelDB! Your efforts help thousands of developers build better AI applications.