import os from 'os';
import { join } from "path";
import { readFile, writeFile, mkdir, rm } from "fs/promises";

const HOME_DIR = os.homedir();
const DIR_PATH = join(HOME_DIR, ".insighta");
const FILE_PATH = join(DIR_PATH, "credentials.json");

export const saveCredentials = async (data) => {
  if (!data) return;

  try {
    await mkdir(DIR_PATH, { recursive: true });

    await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save credential:", error);
    throw error;
  }
}

export const getCredentials = async () => {
  try {
    const data = await readFile(FILE_PATH, { encoding: "utf8" });
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null; // file doesn't exist
    }
    throw error;
  }
}

export const clearCredentials = async () => {
  try {
    await rm(DIR_PATH, { recursive: true, force: true });
  } catch (error) {
    console.error("Failed to clear credentials:", error);
    throw error;
  }
}