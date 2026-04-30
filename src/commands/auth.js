import open from "open";
import chalk from "chalk";
import { createServer } from "http";
import api from "../lib/api.js";
import { BASE_URL, HOST } from "../config.js";
import { clearCredentials, getCredentials, saveCredentials } from "../lib/auth.js";
import { failSpinner, startSpinner, succeedSpinner, stopSpinner } from "../lib/output.js";

export const registerAuthCommands = (program) => {

  // ── login ─────────────────────────────────────────────────────────────────
  program
    .command("login")
    .description("Login with GitHub")
    .action(async () => {
      const PORT = 4242;

      try {
        const server = createServer(async (req, res) => {
          const url = new URL(req.url, `http://${HOST}:${PORT}`);

          if (url.pathname === "/callback") {
            const access_token  = url.searchParams.get("access_token");
            const refresh_token = url.searchParams.get("refresh_token");
            const username      = url.searchParams.get("username");
            const email         = url.searchParams.get("email");
            const role          = url.searchParams.get("role");
            const id            = url.searchParams.get("id");

            if (!access_token || !refresh_token) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "text/html");
              res.end("<h2>Login failed. Missing tokens. Please try again.</h2>");
              server.close();
              process.exit(1);
              return;
            }

            await saveCredentials({
              access_token,
              refresh_token,
              user: { id, username, email, role },
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.end("<h2>Login successful! You can close this tab and return to the terminal.</h2>");

            console.log(chalk.green(`\n✔ Logged in as @${username}`));
            server.close();
            process.exit(0);
          }
        });

        server.listen(PORT);

        // Backend handles the full GitHub OAuth flow and redirects here with tokens
        const authURL = `${BASE_URL}/auth/github?cli_port=${PORT}`;
        open(authURL);
        console.log(chalk.cyan("Opening browser for GitHub authentication..."));
        console.log(chalk.gray("Waiting for callback... (Ctrl+C to cancel)"));

        // Auto-close after 2 minutes if no callback received
        const timeout = setTimeout(() => {
          console.error(chalk.red("\nLogin timed out. Please try again."));
          server.close();
          process.exit(1);
        }, 2 * 60 * 1000);

        // Use readline to reliably capture SIGINT (Ctrl+C)
        const rl = (await import("readline")).createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.on("SIGINT", () => {
          console.log(chalk.yellow("\nLogin cancelled."));
          server.close();
          process.exit(0);
        });

        server.on("close", () => {
          clearTimeout(timeout);
          rl.close();
        });

        server.on("error", (err) => {
          console.error(chalk.red("Server error:", err.message));
          server.close();
          process.exit(1);
        });

      } catch (err) {
        console.error(chalk.red("Login failed:", err.message));
        process.exit(1);
      }
    });

  // ── logout ────────────────────────────────────────────────────────────────
  program
    .command("logout")
    .description("Logout and clear credentials")
    .action(async () => {
      const spinner = startSpinner("Logging out...");
      try {
        const credentials = await getCredentials();

        if (!credentials?.refresh_token) {
          stopSpinner(spinner);
          console.log(chalk.yellow("You are not logged in."));
          return;
        }

        await api.post("/auth/logout", { refresh_token: credentials.refresh_token });
        await clearCredentials();
        succeedSpinner(spinner);
        console.log(chalk.green("Logged out successfully."));
      } catch (err) {
        failSpinner(spinner);
        console.error(chalk.red("Logout failed:", err.message));
      }
    });

  // ── whoami ────────────────────────────────────────────────────────────────
  program
    .command("whoami")
    .description("Show current logged in user")
    .action(async () => {
      const spinner     = startSpinner("Loading...");
      const credentials = await getCredentials();

      if (!credentials) {
        stopSpinner(spinner);
        console.log(chalk.yellow("You are not logged in. Run: insighta login"));
        return;
      }

      succeedSpinner(spinner);
      console.log(chalk.cyan("Username:"), credentials.user.username);
      console.log(chalk.cyan("Email:   "), credentials.user.email);
      console.log(chalk.cyan("Role:    "), credentials.user.role);
    });
};
