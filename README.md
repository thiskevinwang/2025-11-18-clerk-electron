This is an example project of myself exploring integrating Clerk in an Electron app.

The high-level approach consists of:

- Enable the native API for Clerk
- Make Clerk behave like the `@clerk/clerk-expo` SDK
  - "proxy" requests to Clerk through the electron "main" process (using IPC)
    so that the app behaves like a mobile app.

Other notes:
- use Tailwind, for web-like styling
- use file-system based routing so the project can scale

![Image](./docs//image.png)