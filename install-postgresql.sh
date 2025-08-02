#!/bin/bash

echo "🐘 Installing PostgreSQL directly in WSL2..."

# Update package list
sudo apt update

# Install PostgreSQL and additional contrib package
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Enable PostgreSQL to start automatically
sudo systemctl enable postgresql

echo "🔧 Configuring PostgreSQL..."

# Set password for postgres user and create database
sudo -u postgres psql << EOF
ALTER USER postgres PASSWORD 'postgres';
CREATE DATABASE uwibkr_dev;
GRANT ALL PRIVILEGES ON DATABASE uwibkr_dev TO postgres;
\q
EOF

# Configure PostgreSQL to allow connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/#port = 5432/port = 5432/" /etc/postgresql/*/main/postgresql.conf

# Add authentication rule for local connections
echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL to apply changes
sudo service postgresql restart

echo "✅ PostgreSQL installation complete!"
echo ""
echo "📋 Database connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: uwibkr_dev"
echo "   Username: postgres"
echo "   Password: postgres"
echo ""
echo "🔗 Connection string for .env:"
echo "   DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/uwibkr_dev\""
