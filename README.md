# void storage backend

express.js api server for [void storage](https://voidstoragefe.vercel.app/), a minimal file storage service.

## features

- user registration and login with session-based auth
- folder creation, renaming, moving, and deletion
- file upload, renaming, moving, and deletion
- file and folder sharing with expiring links
- cloudinary integration for remote file storage
- rate limiting, helmet security headers, and cors support

## tech stack

- node.js (>=16.20.2) + express 4
- prisma 5 + postgresql
- passport.js (local strategy) + express-session
- cloudinary (file storage via multer in-memory)
- helmet, cors, express-rate-limit

## how to run locally

1. install dependencies

   ```bash
   npm install
   ```

2. create a `.env` file in the root directory

   ```
   DATABASE_URL=          # postgresql connection string
   SESSION_SECRET=        # session signing secret
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   FRONTEND_URL=          # e.g. http://localhost:5173
   ```

3. run prisma migrations

   ```bash
   npx prisma migrate dev
   ```

4. start the server

   ```bash
   npm run dev    # development with nodemon (port 3000)
   npm start      # production
   ```
