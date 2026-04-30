import ora from "ora";
import CliTable3 from "cli-table3";


export const startSpinner = (message) => {
  const oraSpinner = ora(message).start();
  return oraSpinner;
}

export const stopSpinner = (spinner) => {
  spinner.stop();
  console.log("\n");
}

export const succeedSpinner = (spinner) => {
  spinner.succeed()
  console.log("\n");
}

export const failSpinner = (spinner) => {
  spinner.fail()
  console.log("\n");
}

export const renderTable = (columns, rows) => {
  const table = new CliTable3({ head: columns })
  table.push(...rows)
  console.log(table.toString())
}

