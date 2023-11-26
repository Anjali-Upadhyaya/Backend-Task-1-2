# Backend-Task-1-2

Task 1

1. Implemented the /identify endpoint, ensuring that it operates with utmost discretion and precision.
2. Executed the creation of a new "Contact" entry with linkPrecedence="primary" when no existing contacts match the incoming request.
3. Employed a covert strategy for creating "secondary" contact entries when incoming requests match existing contacts and introduce new information.
4. Maintained the integrity of the database state, executing updates seamlessly with each incoming request.

Task 2

1) POST: at localhost:4000/ will give a valid email address and get back a token
   The JSON field will be called ‘email’ in the request.
   A badly formatted or empty email will throw an error instead of providing a token.
   The token will last 5 minutes exactly
2) GET: at localhost:4000/ will get the latest piece of information stored in Redis.
   If an invalid or no token is provided, the API will throw an error.
   If no data is stored in Redis, the API will throw an error
