#!/bin/bash

# QuimeraAI - Setup Script
# Automates installation and configuration

echo "🚀 QuimeraAI - Automated Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found"
    
    if [ -f ENV_EXAMPLE.txt ]; then
        echo "📄 Creating .env.local from ENV_EXAMPLE.txt..."
        cp ENV_EXAMPLE.txt .env.local
        echo "✅ .env.local created"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env.local with your credentials!"
        echo "   Required: Firebase credentials and at least one AI API key"
    else
        echo "❌ ENV_EXAMPLE.txt not found. Please create .env.local manually."
    fi
else
    echo "✅ .env.local already exists"
fi

echo ""

# Prompt for optional dependencies
echo "🔧 Optional Dependencies"
echo "========================"
echo ""

# Playwright
read -p "Install Playwright for E2E testing? (y/N): " install_playwright
if [[ $install_playwright =~ ^[Yy]$ ]]; then
    echo "📦 Installing Playwright..."
    npm install -D @playwright/test
    npx playwright install
    echo "✅ Playwright installed"
else
    echo "⏭️  Skipping Playwright"
fi

echo ""

# Sentry
read -p "Install Sentry for error tracking? (y/N): " install_sentry
if [[ $install_sentry =~ ^[Yy]$ ]]; then
    echo "📦 Installing Sentry..."
    npm install @sentry/react
    echo "✅ Sentry installed"
    echo ""
    echo "⚠️  Remember to:"
    echo "   1. Add VITE_SENTRY_DSN to .env.local"
    echo "   2. Uncomment Sentry code in utils/monitoring.ts"
else
    echo "⏭️  Skipping Sentry"
fi

echo ""

# Axe-core
read -p "Install axe-core for advanced accessibility checking? (y/N): " install_axe
if [[ $install_axe =~ ^[Yy]$ ]]; then
    echo "📦 Installing @axe-core/react..."
    npm install -D @axe-core/react
    echo "✅ axe-core installed"
else
    echo "⏭️  Skipping axe-core"
fi

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit .env.local with your credentials"
echo "   - Firebase config (required)"
echo "   - AI API keys (at least one required)"
echo "   - Sentry DSN (if installed)"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Run tests:"
echo "   npm run test:run"
echo ""
echo "4. Build for production:"
echo "   npm run build"
echo ""
echo "📚 Documentation:"
echo "   - INSTALLATION.md - Complete installation guide"
echo "   - WHATS_NEW.md - Recent changes and features"
echo "   - sistema-compon.plan.md - Implementation plan"
echo ""
echo "🎉 Happy coding with QuimeraAI!"

