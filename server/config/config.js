// To setup a env variable it must be defined in docker-compose.yml and it's value must be assigned in .env file

const required = {
  APP_API_PORT: 1,

  BREVO_API_KEY: 1,
  MAIL_FROM_ADDRESS: 1,
  MAIL_FROM_NAME: 1,
  MAIL_REPLY_TO: 1,

  MONGO_URI: 1,

  R2_ACCOUNT_ID: 1,
  R2_ACCESS_KEY: 1,
  R2_SECRET_KEY: 1,
  R2_BUCKET: 1,
  R2_PUBLIC_URL: 1,

  JWT_ACCESS_SECRET: 1,
  JWT_REFRESH_SECRET: 1,
  JWT_ACCESS_EXPIRATION: 1,
  JWT_REFRESH_EXPIRATION: 1,

  NODE_ENV: 1,
  ALLOWED_ORIGINS: 1,
};

let error = false;
for (let i in required) {
  if (!process.env[i]) {
    error = true;
    console.error(
      `ERROR: ${i} variable is not defined. Please define it in .env file`,
    );
  }
}
if (error) process.exit(1);

module.exports = {
  APP_API_PORT: process.env.APP_API_PORT,

  BREVO_API_KEY: process.env.BREVO_API_KEY,
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS,
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
  MAIL_REPLY_TO: process.env.MAIL_REPLY_TO,

  MONGO_URI: process.env.MONGO_URI,

  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY: process.env.R2_ACCESS_KEY,
  R2_SECRET_KEY: process.env.R2_SECRET_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,

  NODE_ENV: process.env.NODE_ENV || "development",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
};
