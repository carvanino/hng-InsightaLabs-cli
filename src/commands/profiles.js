import chalk from "chalk";
import { writeFileSync } from "fs";
import { join } from "path";
import api from "../lib/api.js";
import { startSpinner, succeedSpinner, failSpinner, renderTable } from "../lib/output.js";

export const registerProfileCommands = (program) => {
  const profiles = program.command("profiles");

  // ── list ──────────────────────────────────────────────────────────────────
  profiles
    .command("list")
    .description("List profiles with optional filters")
    .option("--gender <gender>",         "Filter by gender (male|female)")
    .option("--country <country>",       "Filter by country code (e.g. NG)")
    .option("--age-group <ageGroup>",    "Filter by age group (child|teenager|adult|senior)")
    .option("--min-age <minAge>",        "Minimum age")
    .option("--max-age <maxAge>",        "Maximum age")
    .option("--sort-by <sortBy>",        "Sort field (age|created_at|gender_probability)")
    .option("--order <order>",           "Sort order (asc|desc)")
    .option("--page <page>",             "Page number")
    .option("--limit <limit>",           "Results per page")
    .action(async (options) => {
      const spinner = startSpinner("Fetching profiles...");
      try {
        const params = {};
        if (options.gender)    params.gender     = options.gender;
        if (options.country)   params.country_id = options.country;
        if (options.ageGroup)  params.age_group  = options.ageGroup;
        if (options.minAge)    params.min_age    = options.minAge;
        if (options.maxAge)    params.max_age    = options.maxAge;
        if (options.sortBy)    params.sort_by    = options.sortBy;
        if (options.order)     params.order      = options.order;
        if (options.page)      params.page       = options.page;
        if (options.limit)     params.limit      = options.limit;

        const { data } = await api.get("/api/profiles", { params });

        succeedSpinner(spinner);

        if (!data.data.length) {
          console.log(chalk.yellow("No profiles found."));
          return;
        }

        console.log(chalk.cyan(`Showing ${data.data.length} of ${data.total} profiles (page ${data.page}/${data.total_pages})\n`));

        renderTable(
          ["Name", "Gender", "Age", "Age Group", "Country"],
          data.data.map((p) => [p.name, p.gender, p.age, p.age_group, p.country_name])
        );
      } catch (err) {
        failSpinner(spinner);
        console.error(chalk.red("Failed to fetch profiles:", err.message));
      }
    });

  // ── get ───────────────────────────────────────────────────────────────────
  profiles
    .command("get <id>")
    .description("Get a profile by ID")
    .action(async (id) => {
      const spinner = startSpinner("Fetching profile...");
      try {
        const { data } = await api.get(`/api/profiles/${id}`);

        succeedSpinner(spinner);

        const p = data.data;
        renderTable(
          ["Field", "Value"],
          [
            ["ID",                  p.id],
            ["Name",                p.name],
            ["Gender",              p.gender],
            ["Gender Probability",  p.gender_probability],
            ["Age",                 p.age],
            ["Age Group",           p.age_group],
            ["Country",             p.country_name],
            ["Country Code",        p.country_id],
            ["Country Probability", p.country_probability],
            ["Created At",          p.created_at],
          ]
        );
      } catch (err) {
        failSpinner(spinner);
        console.error(chalk.red("Failed to fetch profile:", err.message));
      }
    });

  // ── search ────────────────────────────────────────────────────────────────
  profiles
    .command("search <query>")
    .description("Search profiles using natural language")
    .option("--page <page>",   "Page number")
    .option("--limit <limit>", "Results per page")
    .action(async (query, options) => {
      const spinner = startSpinner("Searching profiles...");
      try {
        const params = { q: query };
        if (options.page)  params.page  = options.page;
        if (options.limit) params.limit = options.limit;

        const { data } = await api.get("/api/profiles/search", { params });

        succeedSpinner(spinner);

        if (!data.data.length) {
          console.log(chalk.yellow("No profiles matched your query."));
          return;
        }

        console.log(chalk.cyan(`Found ${data.total} profiles\n`));

        renderTable(
          ["Name", "Gender", "Age", "Age Group", "Country"],
          data.data.map((p) => [p.name, p.gender, p.age, p.age_group, p.country_name])
        );
      } catch (err) {
        failSpinner(spinner);
        console.error(chalk.red("Search failed:", err.message));
      }
    });

  // ── create ────────────────────────────────────────────────────────────────
  profiles
    .command("create")
    .description("Create a new profile (admin only)")
    .requiredOption("--name <name>", "Name of the profile to create")
    .action(async (options) => {
      const spinner = startSpinner(`Creating profile for "${options.name}"...`);
      try {
        const { data } = await api.post("/api/profiles", { name: options.name });

        succeedSpinner(spinner);

        const p = data.data;
        console.log(chalk.green(`\nProfile created successfully!\n`));
        renderTable(
          ["Field", "Value"],
          [
            ["ID",      p.id],
            ["Name",    p.name],
            ["Gender",  p.gender],
            ["Age",     p.age],
            ["Country", p.country_name],
          ]
        );
      } catch (err) {
        failSpinner(spinner);
        const message = err.response?.data?.message ?? err.message;
        console.error(chalk.red("Failed to create profile:", message));
      }
    });

  // ── export ────────────────────────────────────────────────────────────────
  profiles
    .command("export")
    .description("Export profiles as CSV")
    .requiredOption("--format <format>", "Export format (csv)")
    .option("--gender <gender>",      "Filter by gender")
    .option("--country <country>",    "Filter by country code")
    .option("--age-group <ageGroup>", "Filter by age group")
    .option("--min-age <minAge>",     "Minimum age")
    .option("--max-age <maxAge>",     "Maximum age")
    .action(async (options) => {
      if (options.format !== "csv") {
        console.error(chalk.red("Only --format csv is supported."));
        return;
      }

      const spinner = startSpinner("Exporting profiles...");
      try {
        const params = { format: options.format };
        if (options.gender)   params.gender     = options.gender;
        if (options.country)  params.country_id = options.country;
        if (options.ageGroup) params.age_group  = options.ageGroup;
        if (options.minAge)   params.min_age    = options.minAge;
        if (options.maxAge)   params.max_age    = options.maxAge;

        const { data, headers } = await api.get("/api/profiles/export", { params });

        // Derive filename from Content-Disposition header or generate one
        const disposition = headers["content-disposition"] ?? "";
        const match       = disposition.match(/filename="?([^"]+)"?/);
        const filename    = match ? match[1] : `profiles_${Date.now()}.csv`;
        const outputPath  = join(process.cwd(), filename);

        writeFileSync(outputPath, data);

        succeedSpinner(spinner);
        console.log(chalk.green(`\nExported to: ${outputPath}`));
      } catch (err) {
        failSpinner(spinner);
        console.error(chalk.red("Export failed:", err.message));
      }
    });
};
