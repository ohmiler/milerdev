# Empty test environment directory

Vitest points Vite's `envDir` here so it does not load the application's local environment files. Keep this directory free of `.env*` files; test configuration belongs in mocks and `tests/setup.ts`.
