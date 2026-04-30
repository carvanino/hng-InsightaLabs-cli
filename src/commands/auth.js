import open from "open";
import chalk from "chalk";
import { createServer } from "http";
import api from "../lib/api.js";
import {
  BASE_URL,
  GITHUB_CALLBACK_URL,
  GITHUB_CLIENT_ID,
  GITHUB_OAUTH_URL
} from "../config.js";
import { clearCredentials, getCredentials, saveCredentials } from "../lib/auth.js";
import { failSpinner, startSpinner, succeedSpinner } from "../lib/output.js";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "../lib/pkce.js";

export const registerAuthCommands = (program) => {

  program
    .command("login")
    .description("Login with GitHub")
    .action(async () => {
      const spinner = startSpinner('Logging in...');
      try {
        const state = generateState();
        const code_verifier = generateCodeVerifier();
        const code_challenge = generateCodeChallenge(code_verifier);
        const PORT = 4242;

        const server = createServer(async (req, res) => {
          const url = new URL(req.url, BASE_URL);
          if (url.pathname === "/callback") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");

            const authCode = url.searchParams.get("code");
            const callbackState = url.searchParams.get("state");

            if (callbackState !== state) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid state" }));
              return;
            }

            const { data } = await api.post(`${BASE_URL}/auth/github/callback`, {
              code: authCode,
              state,
              code_verifier,
            }, {
              headers: {
                "Content-Type": "application/json",
              }
            });

            await saveCredentials(data);

            succeedSpinner(spinner);
            console.log(`Logged in as @${data.user.username}`);
            res.end(JSON.stringify({ message: "Login successful, you can close this tab." }));
            server.close();
          }
        });

        server.listen(PORT);

        const params = new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID,
          redirect_uri: `http://localhost:${PORT}/callback`,
          scope: "read:user user:email",
          state,
          code_challenge,
          code_challenge_method: "S256"
        });

        const authURL = `${GITHUB_OAUTH_URL}?${params?.toString()}`;

        open(authURL);

        console.log("Please authorize the app in your browser.");

        server.on("error", (err) => {
          console.error("Server error:", err.message);
          failSpinner(spinner);
        });

        server.on("close", () => {
          console.log("Server closed");
        });

      } catch (error) {
        console.error(error);
        failSpinner(spinner);
      }
    })


  program
    .command("logout")
    .description("Logout from Github")
    .action(async () => {
      const spinner = startSpinner('Logging out user');
      try {
        const credentials = await getCredentials();

        if (!credentials?.refresh_token) {
          spinner.stop();
          console.log("You are not logged in.");
          return;
        }

        const refreshToken = credentials.refresh_token;

        await api.post('/auth/logout', {
          refresh_token: refreshToken,
        }, {
          headers: {
            "Content-Type": "application/json",
          }
        });
        await clearCredentials();
        succeedSpinner(spinner);
      } catch (err) {
        failSpinner(spinner);
        console.error(chalk.red("Logout failed:", err.message));
      }
    })

  program
    .command("whoami")
    .description("Get current user")
    .action(async () => {
      const spinner = startSpinner("Loading");
      const credentials = await getCredentials();
      if (!credentials) {
        console.log(chalk.yellow("You are not logged in. Run: insighta login"));
        spinner.stop();
        return;
      }
      console.log(chalk.green("Username: ", credentials.user.username));
      console.log(chalk.green("Email: ", credentials.user.email));
      console.log(chalk.green("Role: ", credentials.user.role));
      succeedSpinner(spinner);
    })
}