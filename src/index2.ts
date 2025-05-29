import { TypeAliasPrinter } from "./Printer/printer";
const printer = new TypeAliasPrinter("src/index2.ts");

// type hi = string | number;
// type hi2 = string;

// type hi3 = hi & hi2;

// printer.printType("hi2");
// printer.printType("hi3");
type h2 = {
  name: string;
  age: number;
};
type hi = string | h2;

printer.printType("hi");
