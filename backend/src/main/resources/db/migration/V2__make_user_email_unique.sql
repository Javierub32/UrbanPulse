CREATE UNIQUE INDEX "uq_User_email_ignore_case"
    ON "User" (lower("email"));
