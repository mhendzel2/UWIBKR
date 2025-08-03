-- Initialize the database with basic setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE uwibkr_dev TO postgres;
