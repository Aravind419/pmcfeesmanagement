# Environment Setup Guide

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Update the MongoDB credentials:**
   - Replace `your-username` with your MongoDB Atlas username
   - Replace `your-password` with your MongoDB Atlas password
   - Replace `your-cluster` with your MongoDB cluster name
   - Replace `your-database` with your desired database name

3. **Generate a secure JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Required Environment Variables

### Database Configuration
- `MONGODB_URI`: MongoDB Atlas connection string
- `MONGODB_DB`: Database name for the application

### Authentication
- `JWT_SECRET`: Secret key for JWT token generation
- `SESSION_COOKIE`: Name for the session cookie

### Application Settings
- `CLIENT_ORIGIN`: Frontend URL for CORS
- `NODE_ENV`: Environment (development/production)

## Optional Environment Variables

### Payment Gateway
- `UPI_ID`: UPI ID for payments
- `UPI_QR_DATA_URL`: QR code URL for UPI payments

### Email Configuration
- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password

### File Upload
- `MAX_FILE_SIZE`: Maximum file upload size
- `ALLOWED_FILE_TYPES`: Allowed file extensions

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for production
- Rotate JWT secrets regularly
- Use environment-specific configurations
