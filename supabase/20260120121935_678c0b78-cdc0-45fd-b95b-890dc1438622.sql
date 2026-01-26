-- Enable pgcrypto extension for digest function used in NDA hash calculations
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;