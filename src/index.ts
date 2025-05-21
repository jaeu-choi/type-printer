// import { TypeAliasPrinter } from "./printer";
// // console.log('Hello');

// // console.log('Watch?');

// // console.log('HELlo');
// const source = `
// type User = {
//   id: number;
//   name: string;
//   isAdmin: boolean;
// };

// type NewUser = {
//   [P in keyof User]: User[P];
// };
// `;

// const sourceFile =
//     ts.createSourceFile('test.ts', source, ts.ScriptTarget.Latest, true);

// const program = ts.createProgram({rootNames: ['test.ts'], options: {}});

// const checker = program.getTypeChecker();

// sourceFile.forEachChild((node) => {
//   if (ts.isTypeAliasDeclaration(node) && node.name.text === 'NewUser') {
//     const type = checker.getTypeAtLocation(node);
//     console.log(checker.typeToString(type));
//   }
// });

// type User = {
//   id: number; name: string; isAdmin: boolean;
// };

// type NewUser = {
//   [P in keyof User]: User[P];
// };
// type ViewNewUser = NewUser<User>;

// type User = {
//   id: number; name: string; isAdmin: boolean;
// }

// type UserKeys = `${keyof User}`;

// const keys: UserKeys[] = ['id', 'name', 'isAdmin'];

// keys.forEach((key) => console.log(key));

// type User = {
//   id: number; name: string; isAdmin: boolean;
// }

// type KeyValueType = {
//   [P in keyof User]: {
//     // User의 키를 순회
//     key: P;  // key 속성의 타입은 현재 키 이름 P (string literal type)
//     valueType: User[P];  // valueType 속성의 타입은 User[P] (값 타입)
//   };
// };

// KeyValueType 은 다음과 같이 추론됩니다.
// type KeyValueType = {
//   id: {key: 'id'; valueType: number;}; name: {key: 'name'; valueType:
//   string;}; isAdmin: {key: 'isAdmin'; valueType: boolean;};
// }
// import {TypeAnalyzer} from './type-analyzer';

// type User = {
//   id: number; name: string; isAdmin: boolean;
// };

// type NewUser = {
//   [P in keyof User]: User[P];
// };

// type StingfiedUser = {
//   [P in keyof User]: string;
// };

// const analyzer = new TypeAnalyzer([__filename]);
// analyzer.analyze('NewUser');

// // ✅ 강제로 타입 사용
// const example: NewUser = {
//   id: 1,
//   name: 'John Doe',
//   isAdmin: true
// };

// // console.log(example);
// import {TypeAnalyzer} from './type-analyzer';

// // 예시 타입 정의
// type User = {
//   id: number; name: string; isAdmin: boolean;
// };

// type NewUser = {
//   [P in keyof User]: User[P];
// };

// type StringfiedUser = {
//   [P in keyof User]: string;
// };

// // TypeAnalyzer 인스턴스 생성
// // __filename을 사용하여 현재 파일을 분석 대상으로 명시할 수 있습니다.
// const analyzer = new TypeAnalyzer([__filename]);

// // 분석할 타입 별칭 이름 지정
// analyzer.analyze('NewUser');
// analyzer.analyze('StringfiedUser');

// 예시 타입 정의
// type User = {
//   id: number; name: string; isAdmin: boolean;
// };

// type NewUser = {
//   [P in keyof User]: User[P];
// };

// type StringfiedUser = {
//   [P in keyof User]: string;
// };

// type Tool = {
//   [P in keyof User]: number;
// }

// import { TypeAliasPrinter } from "./printer";

// index.ts 파일 내에서 사용할 타입 별칭들이 정의되어 있어야 합니다.
// 예시로 다음과 같이 타입들을 정의했다고 가정합니다.
// type NewType<T> = {
//   [P in keyof T]: T[P];
// }

// type Example = {
//   a: number; b: string; c: boolean
// };

// type UppercaseKeys<T> = {
//   [P in keyof T as Uppercase<P&string>]: T[P];
// };

// type Result = UppercaseKeys<Example>;

// type PrefixKeys<T> = {
//   [P in keyof T as `PrefixKey_${string & P}`]: T[P];
// }

// type Example = {
//   a: number; b: string; c: boolean
// };

// type Mapped = {
//   [P in keyof Example]: Example[P];
// };

// type ValueTypes<T> = {
//   [P in keyof T]: T[P];
// }[keyof T];

// type result = ValueTypes<Example>;

// type User = {
//   id: number; name: string; isActive: boolean;
// }

// type UserValueTypes = {
//   [P in keyof User]: User[P];
// }[keyof User];

// type DeepPartial<T> = {
//   [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]>: T[P];
// }

// type User = {
//   id: number; profile: {name: string; age: number;}
// }

// type PartialUser = DeepPartial<User>;

// type User = {
//   id: number; name: string; age: number;
// };
// type PickUser = Pick<User, 'id'|'age'>;

// const colors = {
//   red: '#F45452',
//   green: '#C952A',
//   blue: '#1A7CFF',
// } as const;

// // const getColorHex = (key: string) => colors[key];
// const getColorHex = (key: keyof typeof colors) => colors[key];
// ///////////////////////////////////////////////////////////////////////////
// TypeAliasPrinter 클래스 인스턴스 생성 (현재 파일인 index.ts를 전달)
// const printer = new TypeAliasPrinter("src/index.ts");

// type NewUser = {
//   [P in keyof User]: User[P];
// };

// type User = {
//   id: number;
//   name: string;
//   age: number;
//   email?: string;
// };

// type RequireName<T> = T extends any
//   ? { name: T extends { name: infer N } ? N : never } & Partial<Omit<T, "name">>
//   : never;

// interface RequiredNameUser extends RequireName<User> {
//   sex: string;
// }

// printer.printType("RequiredNameUser");
// interface ApiResponse<T> {
//   data: T;
//   success: boolean;
//   error?: string;
// }

// type userResponse = ApiResponse<User>;
// printer.printType("userResponse");

// interface ApiResult<T> {
//   status: "success" | "error";
//   data: T;
//   message?: string;
// }

// interface Paginated<T> {
//   items: T[];
//   total: number;
//   page: number;
//   perPage: number;
// }

// type User = {
//   id: number;
//   name: string;
// };

// type UserListResponse = ApiResult<Paginated<User>>;

// printer.printType("UserListResponse");
// printer.printType("NewUser");

// printer.printType("BuiltInOBJ");

// interface TypeWithLength {
//   length: number;
// }

// function exampleFunc<T extends TypeWithLength>(arg: T): number {
//   return arg.length;
// }
// import { TypeAnawlyzer } from "./type-analyzer";
// const prim = new TypeAnawlyzer("./index.ts");
// prim.analyze("NewUser");
// printer.printType("TypeWithLength");

// function identity<T>(value: T): T {
//   return value;
// }

// console.log(typeof identity(123));

// function zip(a,b){
//   const len = Math.min(a.length, b.length);
//   const result = [];
//   for (let i=0; i < len; i++){
//     result.push([a[i],b[i]]);
//   }
//   return result;
// }

// function zip<T, U>(a: T[], b: U[]): [T, U][] {
//   const len = Math.min(a.length, b.length);
//   const result: [T, U][] = [];
//   for (let i = 0; i < len; i++) {
//     result.push([a[i], b[i]]);
//   }
//   return result;
// }
// type mymethod = { ZipFunction: <T, U>(a: T[], b: U[]) => [T, U][] };

// type ZipFunction = <T, U>(a: T[], b: U[]) => [T, U][];

// function zip<T, U>(a: T[], b: U[]): [T, U][] {
//   const len = Math.min(a.length, b.length);
//   const result: [T, U][] = [];
//   for (let i = 0; i < len; i++) {
//     result.push([a[i], b[i]]);
//   }
//   return result;
// }

// function filter(arr, predicate) {
//   const result = [];
//   for (const item of arr) {
//     if (predicate(item)) result.push(item);
//   }
//   return result;
// }

// function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
//   const result: T[] = [];
//   for (const item of arr) {
//     if (predicate(item)) result.push(item);
//   }
//   return result;
// }

// function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
//   const result: T[] = [];
//   for (const item of arr) {
//     if (predicate(item)) result.push(item);
//   }
//   return result;
// }

// type filter = <T>(arr: T[], predicate: (item: T) => boolean) => T[]; // const people = [
//   { name: "alice", age: 20 },
//   { name: "Bob", age: 20 },
//   { name: "Charlie", age: 30 },
// ];
// // groupBy(people, (person) => person.age);
// people.groupBy(people, (person) => person.age);
// const people = [
//   { name: "Alice", age: 20 },
//   { name: "Bob", age: 20 },
//   { name: "Charlie", age: 30 },
// ];

// groupBy(people, (person) => person.age);

// function groupBy(arr, keyFn) {
//   const result = {};
//   for (const item of arr) {
//     const key = keyFn(item);
//     if (!result[key]) {
//       result[key] = [];
//     }
//     result[key].push(item);
//   }
//   return result;
// }
// function groupBy<T, K extends PropertyKey>(
//   arr: T[],
//   keyFn: (item: T) => K
// ): Record<K, T[]> {
//   const result = {} as Record<K, T[]>;
//   //“지금은 비어있지만, 이건 결국 K 타입 키들을 가지고 T[] 값을 가지게 될 거야”
//   //라고 개발자가 약속한 것으로 받아들입니다

//   for (const item of arr) {
//     const key = keyFn(item);
//     if (!result[key]) {
//       result[key] = [];
//     }
//     result[key].push(item);
//   }
//   return result;
// }

// console.log(groupBy(people, (person) => person.age));
/// 오늘배운거 제네릭 기초
// 함수 작성법
// 함수 시그니처
// js의 대표 함수들 Ts로 변환하는 과정에서 제네릭의 필요성

// 다음 flatten 이나 reduce

// function identity<T>(value: T): T {
//   return value;
// }

// console.log(identity(123));
//
// console.log(identity("HELLLO"));

// function stringfy<T>(value: T): string {
//   return JSON.stringify(value);
// }

// console.log(stringfy({ name: "John", age: 30 }));
//
// function getId<T extends { id: number }>(item: T): number {
//   return item.id;
// }

// console.log(getId({ id: 920326, name: "jaue" }));

// type ResponseType<T> = T extends string ? number : boolean;
//
// function process<T>(input: T): ResponseType<T> {
//   if (typeof input == "string") {
//     return input.length as ResponseType<T>;
//   }
//   return true as ResponseType<T>;
// }
// console.log("He");
//
// function process2<T>(input:T)ResponseType<T>{
//   if(typeof input == "string'){
//   return input.length as ResponseType<T>;
//   }
//   return true as ResponseType<T>;
// }

// console.log(process("Helloworld"));
// console.log(process(123));
// console.log(process({ name: "jaue" }));
//
// type ApiResponse<T> = T extends Error ? { success: false, error: T } : { success: true; data: T };
//
// function handleResponse<T>(response: T): ApiResponse<T> {
//   if (response instanceof Error) {
//     return { success: false, error: response } as ApiResponse<T>;
//   }
//   return { success: true, data: response } as ApiResponse<T>;
// }

// type ApiResponse<T> = T extends Error
//   ? { success: false; error: T }
//   : { success: true; data: T };
//
// function handleResponse<T>(response: T): ApiResponse<T> {
//   if (response instanceof Error) {
//     return { success: false, error: response } as ApiResponse<T>;
//   }
//   return { success: true, data: response } as ApiResponse<T>;
// }
// const successResult = handleResponse({ id: 1, name: "Alice" });
// console.log(successResult);
//
// const errorResult = handleResponse(new Error("something went wrong"));
// console.log(errorResult);
//

// type ButtonProps<T extends "link" | "button"> = T extends "link"
//   ? { href: string; onClick?: never }
//   : { onClick: () => void; href?: never };
//
// function Button<T extends "link" | "button"> (props:ButtonProps<T>){
//
// }
// <Buttton type ="link" href="https//example.com" />;
// type ZipFunction = <T, U>(a: T[], b: U[]) => [T, U][];
// type myMethod = {
//   ZipFunction: <T, U>(a: T[], b: U[]) => [T, U][];
// };
//
// type Add = (a: number, b: number) => number;
// type GreetingFn = (name: string) => string;
//
// interface Multiply {
//   (x: number, y: number): number;
// }
//
// const mul: Multiply = (x, y) => x * y;
//
// type Identity = <T>(arg: T) => T;
// const identity: Identity = <T>(arg: T) => arg;
//
//
// type Identity = <T>(arg: T) => T;

// type Wrapper<T> = {
//   value: T;
// };

// interface Wrapper<T> {
//   value: T;
//   name: T[];
// }
//
// interface Wrapper2<P> extends Wrppper {
//   value: P;
// }
// class StorageBox<T> {
//   private items: T[] = [];
//   addItem(item: T): void {
//     this.items.push(item);
//   }
//
//   getAllItems(): T[] {
//     return [...this.items];
//   }
// }
//
// type User = { id: number; name: string; email: string };
//
// class Extractor<T> {
//   constructor(sample?: T) {}
//   extract<K extends keyof T>(obj: T, key: K): T[K] {
//     return obj[key];
//   }
// }
//
// const user = { id: 1, name: "Alic", email: "alice@naver.cim" };
//
// const e = new Extractor<User>();
// const e2 = new Extractor(user);
// console.log(e.extract(user, "email"));
//

// class DataTable<T> {
//   private rows: T[] = [];
//   addRow(row: T): void {
//     this.rows.push(row);
//   }
//
//   getAll(): T[] {
//     return [...this.rows];
//   }
//   getColumn<K extends keyof T>(key: K): T[K][] {
//     return this.rows.map((row) => row[key]);
//   }
// }

// class DataTable<T> {
//   private rows: T[] = [];
//   addRow(row: T): void {
//     this.rows.push(row);
//   }
//
//   getAll(): T[] {
//     return [...this.rows];
//   }
//
//   getColumn<K extends keyof T>(key: K): T[K][] {
//     return this.rows.map((row) => row[key]);
//   }
// }

// type User = { id: number; name: string;
//   email: string;
// };
//
// const table = new DataTable<User>();
//
// table.addRow({ id: 1, name: "Alice", email: "a@ex.com" });
// table.addRow({ id: 2, name: "Bob", email: "b@ex.com" });
//
// console.log(table.getAll());
//
// console.log(table.getColumn("id"));
// console.log(table.getColumn("number"));
//
//
//
// type ApiResponse<T> = {
//   data: T;
//   success: boolean;
//   errorMessage?: string;
// };
//
// type User = {
//   id: number;
//   name: string;
// };
//
// const userResponse: ApiResponse<User> = {
//   data: { id: 1, name: "alice" },
//   success: true,
// };
//
// interface Container<T> {
//   value: T;
//   set(value: T): void;
//   get(): T;
// }
//
// const stringContainer: Container<string> = {
//   value: "Hello",
//   set(v) {
//     this.value = v;
//   },
//   get() {
//     return this.value;
//   },
// };
//
// console.log(stringContainer.get());
//

// interface Wrapper<T> {
//   value: T;
// }
//
// function warp<T>(v: T): Wrapper<T> {
//   return { value: v };
// }
//
// const wrappedNum = warp(123);
// console.log(wrappedNum);
//
// const wrappedString = warp("Hello");
// console.log(wrappedString);
//
//
// type Result<T> = {
//   success: boolean;
//   data: T;
// };
//
// type ApiResponse<T> = {
//   status: number;
//   body: Result<T>;
// };
// type User = { id: number; name: string };
//
// const response: ApiResponse<User> = {
//   status: 200,
//   body: {
//     success: true,
//     data: { id: 1, name: "Alice" },
//   },
// };

// interface Storage<T> {
//   set(value: T): void;
//   get(): T;
// }

// interface StorageFactory {
//   create<T>(): Storage<T>;
// }

// const factory: StorageFactory = {
//   create<T>() {
//     let internal: T;
//     return {
//       set(value: T) {
//         internal = value;
//       },
//       get() {
//         return internal;
//       },
//     };
//   },
// };

// const stringStorage = factory.create<string>();
// stringStorage.set("Hello");
// console.log(stringStorage.get());

// const arr3: Array<string> = ["a", "B", "C"];
// const arr4: string[] = ["a", "B", "C"];

// type Mapper = <T>(x: T) => T;
// interface Collect {
//   // Mapper(x: T): T;
//   Mapper: <T>(x: T) => T;
//   log: (msg: string) => void;
// }

// function log(msg: string) {
//   console.log(msg);
// }

// type Middleware = (next: () => void) => () => void;

// interface Collect2<Q> {
//   Mapper: <T>(x: T) => T;
// }
// interface Collect3<T> {
//   name: string;
//   opus: string;
//   posthum: <T>(item: T) => void;
//   posthum2: <G>(item: G) => void;
// }

// function fn2<T>(x: T): T {
//   return x;
// }
// const fn = <T>(x: T): T => x;

// const fu2 = <T>(x: T): T => x;

// interface Container<T> {
//   value: T;
//   get(x: T): T;
// }

// console.log(fn(10));
// console.log(fn2(20));

// type Box<T> = {
//   value: T;
// };

// class Stack<T> {
//   private items: T[] = [];
//   push(item: T) {
//     this.items.push(item);
//   }
//   pop(): T | undefined {
//     return this.items.pop();
//   }
// }

// type Mapper12 = <T>(x: T) => T;

// function firstElement<T>(arr: Array<T>): T {
//   return arr[0];
// }
// function firstElement<T>(arr: T[]): T {
//   return arr[0];
// }
// const n = firstElement([200, 1, 2, 3]);
// console.log(n);

// let pair: [string, number] = ["Age", 30];

// function makePair<A, B>(a: A, b: B): [A, B] {
//   return [a, b];
// }

// const p1 = makePair("Hello", 123);
// const p2 = makePair(true, { x: 1 });
// const fn = <T>(x: T): void => void 0;

// type emptyFn = <T>(x: T) => void;

// import { TypeAliasPrinter } from "./newprinterwF";
// const fn2 = <T>(x: T): void => {};
// const fn3: emptyFn = {};

// const fn2 = <T>(x: T): void => {};
// const fn3 = <T>(x: T): T => x;
//  const fn = <T>(x: T): T => x;

// const fn4 = () => console.log("Hi");
// const fn5 = (x: string) => console.log(x);

// const fn6 = <T>(x: T) => console.log(x);

// function fn6sun<T>(x: T): void {
//   console.log(x);
// }
// type Fn6Signature = <T>(x: T) => void;

// const fn6: Fn6Signature = (x) => console.log("Hi");

// const f1 = (x: string): void => {
//   console.log(x);
// };

// const f2 = (x: string): string => {
//   return x;
// };
// type Fn = (x: number) => string;

// function playViolin(x: string): void {
//   console.log(x);
// }
// function playviolin4<T>(x: T): void {
//   console.log(x);
// }

// const playviolin2 = (x: string) => console.log(x);

// const playViolin3 = <T extends string, Q>(x: T, r: Q): void => {
//   console.log(x);
// };

// const t1 = fn1("hello");
// printer2.printType("t1");
// const t2 = fn2("Hi");
// printer2.printType("t2");
// const t3 = <T>(x: T): void => {
//   console.log(x);
// };

// const t4 = <T>(x: T): void => {
//   console.log(x);
// };
// type IdentityFn = <T>(x: T) => T;

// const t5 = <T>(x: T): void => {
//   console.log(x);
// };
// const t6 = <T>(x: T): void => {
//   console.log("HI");
// };

// printer2.printFunctionSignature("t6");

// // src/index.ts
// interface A {
//   a: number;
// }

// interface B extends A {
//   b: string;
// }

// type d = {
//   name: string;
// };

// function processUser(
//   user: { name: string; age: number },
//   callback?: (user: any) => void
// ): { name: string; age: number } {
//   return user;
// }
// // 인터페이스 출력 테스트
// console.log("\n인터페이스 출력 테스트:");
// printer2.printType("B"); // 인터페이스 B (A를 확장)

// // 타입 별칭 출력 테스트
// console.log("\n타입 별칭 출력 테스트:");
// printer2.printType("d"); // 타입 c

// // 함수 시그니처 출력 테스트
// console.log("\n함수 시그니처 출력 테스트:");
// printer2.printFunctionSignature("processUser"); // 함수 시그니처

// function isString(x: any): x is string {
//   return typeof x === "string";
// }

// printer2.printFunctionSignature("isString");

// type Cat = { meow: () => void };
// type Dog = { bark: () => void };

// function isCat(animal: Cat | Dog): animal is Cat {
//   return (animal as Cat).meow !== undefined;
// }
// function HandleAnimal(animal: Cat | Dog) {
//   if (isCat(animal)) {
//     animal.meow();
//   } else {
//     animal.bark();
//   }
// }

// printer2.printFunctionSignature("HandleAnimal");

// function Mozzart(x: string): string {
//   return "Hello";
// }

// const fn23 = (x: string): string => x;

// function Mozzart2<T>(x: T) {
//   return x;
// }

// const fn24 = (x: string) => {
//   console.log(x);
// };

// function BMW(x: string): string {
//   return x;
// }

// const BMW_1 = (x: string): string => {
//   return x;
// };

// function BMW2<T>(x: T): T {
//   return x;
// }

// const BMW_2 = <T>(x: T): T => {
//   return x;
// };

// type inout = <T>(x: T) => T;

// const BMW_2: inout = (x) => {
//   return x;
// };

// function fn_D<T>(x: T): T {
//   return x;
// }
// const fn_E = <T>(x: T): T => {
//   return x;
// };
// const fn_E1 = function <T>(x: T): T {
//   return x;
// };

// function fn_D2(x) {
//   return x;
// }

// const fn_E = function (x) {
//   return x;
// };

// const fn_e2 = (x) => {
//   return x; };
// function getType(x: string): string;

// type StringtoString = (x: string) => string;

// interface res {
//   <T>(x: T): T;
// }

// interface StringtoString {
//   (x: string): string;
// }

// interface StringToString {
//   <T>(x: T): T;
// }

// type stringToString = (x: string) => string;

// type User = {
//   name: string;
//   age: number;
//   height: number;
// };

// type userkeys = keyof User;

// printer2.printType("userkeys");

// type User2 = {
//   "qwe|age": string;
// };

// type User = {
//   name: string;
//   age: number;
//   isAdmin: boolean;
// };
//
// type keys = "name" | "age" | "isAdmin";
// type values = User[keys];
//
// printer2.printType("values");

// type Dict = {
//   [key: string]: number;
// };

// const cores: Dict = {
//   math: 90,
//   english: 100,
// };

// printer2.printType("cores");
// printer2.printType("Dict");

// import { TypeAliasPrinter } from "./newprinterfromgrok";

// const printer = new TypeAliasPrinter("src/index.ts");

// type User = {
//   name: string;
//   age: number;
// };
// // printer.printType("User");

// type Dict = {
//   [key: string]: number;
// };

// const cores: Dict = {
//   math: 90,
//   english: 100,
// };
// // printer.printType("Dict");
// // printer.printType("cores");

// type createLogger = {
//   log: (msg: string) => void;
// };

// interface createLoggerI {
//   (): { log(msg: string): void };
// }

// function CreateLogger() {
//   return {
//     log(msg: string) {
//       console.log("Log:", msg);
//     },
//   };
// }

// const Factory: createLoggerI = CreateLogger;

// function CreateService() {
//   return {
//     ...CreateLogger(),
//     run() {
//       this.log("Running");
//     },
//   };
// }

// const service = CreateService();

// function add3(x: string): string {
//   return x;
// }

// const add = (x: string): string => {
//   return x;
// };

// type oq = (x: string) => string;

// const add333: oq = (x) => {
//   return x;
// };
/*
  페이커: 자기일 열심히 '잘'하면서 인성도 좋아서 까고싶어도 깔 수 가 없으며 결국에는 안티팬도 그의 바짓가랑이를 붙잡으며 찬양을 하게 되는 인간과 신 사이의 존재를 지칭하는 말.
  기존의 패턴을 사용 -> 요구사항발생 -> 대응 -> 개발편의성측면의 불편 발생 -> 개발자불편지속 -> 새로운 패턴 방법의 제시 -> 기존 흥선대원군들에게 받아드려지지 않음 -> 페이커 등장 -> 페이커가 제시 -> 흥선대원군도 인정
  ->표준은 아니지만 사실상의 표준 -> 지속 -> 표준 등재의 논의 시작 -> 엄근진적 논의 -> 실험적 기능 -> 호환성 검토 -> 가까스로 표준으로 등재 -> 레거시 프로젝트에서의 리팩터링시 사용건의 -> 부장님선에서 컷 -> 부장님: 소잡는데 는 소잡는 칼이 있는 법이고 닭잡는... 팡션이런거 쓰지마세요. ->
  ->차세대 또는 새로운 프로젝트는 계속해서 새로운 패턴 사용 -> 레거시는 점점 사라짐 

  TS 에서 딸깍하면 사용되는 기능들을 기존 C++가 도달 했던 과정의 일부. 즉 TS에서의 고급 기능들은 표면상의 그것보다 복잡하다. 그 장막아래에 복잡성을 C++수준으로 설명하자면 정말로 소잡는데 쓰는 칼로 닭잡는 일이 발생.
    예, type someType<T> = (q:T) => void; 이거하나를 c++ 로 설명하려면, 스마트포인터, 제너릭 , 함수객체, tempalte meta programming c++20 Concepts <- 머리 아픈 일의 연속.
    아~ <T>에 무슨 타입넣으면 T자리에 그거 들가요 <- 세상간단
    1. 타입스크립트 그자체의 의미
    2. 탑다운 방식의 프로그래밍 언어적 성취. 고급기능 TS-> 다른거 안배워도 되지만 배운다면 그 때 더 도움 될 수 있음.
  
*/

/*
  안녕하세요 반갑습니다. 이 강의는 타입스크립트의 고급기능에 대해 설명하는 강의입니다. 기본적인 자바스크립트의 동작 원리와, 문법은 알고 있다고 가정하고 있습니다. 또한 타입스크립트의 기본적인 문법들, 예를들면 타입별칭을 선언하는 것, 
  인터페이스 키워드로 타입를 표현하는것,유니온타입이 무엇인지 리터럴 문자열타입이란 무엇인지에 대해서는 다루지 않거나 아주 짧게만 다룹니다.
  이 강의는 타입스크립트 고급기능의 활용에 초점을 두고 있습니다.  단순히 고급문법을 같이 써보고 동작을 해설 하는 것, 컴파일러가 고급문법을 해석하는 것을 넘어서 실제로 원하는 수강생이 복잡한 타입을 설계하고
  그것을 구현해내는것을 목표로합니다. 

  //타입스크립트는 자바스크립트의 슈퍼셋인 언어라, 정말 재밋게도 바닐라자바스크립트를 선호하는 사람들도 타입스크립트에 대한 평가가 좋지않고  c++같은 정적타입언어를 선호하는 사람들도 타입스크립트에 대한 평가가 좋지않습니다.

  일부 바닐라 자바스크립트 선호자는 타입스크립트의 복잡성을 꺼리고, C++ 같은 정적 타입 언어 선호자는 타입스크립트의 동적 특성을 비판하기도 합니다
  제생각은 타입스크립트는 현대언어의 고급기능을 아주 쉽게 맛보기 할 수 있는 훌륭한 언어입니다. 동시에  자바스크립트의 기본 철학을 훼손하지 않기 위해 노력한 흔적이 엿보이는 훌륭한 언어라고 생각합니다. 

  AI를 통해 바이브 코딩이 활발하게 일어나는 지금 다른것보다 타입스크립트를 꼭 배워야 하고 그중에도 꼭 고급기능에 대해 배워야 할까? 하는 의문이 있으신 분들도 있을 것 같습니다. 
  
  ChatGPT와 같은 AI 챗봇 서비스는 출시 당시 주로 웹을 통해 제공되었습니다. 이는 웹의 안정적인 레거시 인프라, 높은 사용자 접근성, 그리고 서버 기반의 효율적인 대화 컨텍스트 동기화 덕분입니다. 
  모바일 앱이나 데스크톱 앱은 이후 추가되었지만, 긴 대화에서 컨텍스트 동기화의 안정성은 웹이 여전히 강점을 가집니다. 즉 앞으로의 출시할 많은 서비스들도 웹이 서비스를 위한 플랫폼이 될거라고 생각합니다.
  자바스크립트는 스크립팅 언어에 불과하지만 웹을 다루려면 결국 자바스크립트를 할 수 밖에 없다고 생각합니다. 자바스크립트는 DOM API 를 조작할 수 있는 유일한 언어입니다.

  하지만 자바스크립트의 스크립팅언어적 특성에 더해 더 견고한 소프트웨어를 만들기 위해서는 타입시스템은 필수적입니다. 이는 더 구조적으로 안정적이며 재사용성있는 코드를 만드는데 필수 적이라 생각합니다. 어떤 사람들은 바닐라 자바스크립트만으로,
  타입스크립트를 대체할 수 있다고 생각하지만 제생각에는 자바스크립트로는 할 수 없는 타입스크립트만의 철학과 기능이 있습니다. 그리고 이 강의를 마칠 때 쯤이면 확실하게 그 말을 증명할 수 있을 거라 확신합니다.

  이 강의는 크게 4가지 섹션으로 나뉩니다.
  0. 타입스크립트의 특징과 컴파일러의 동작.
  1. 타입매칭패턴요소
  2. 타입의 확장
  3. 타입의 제한
  4. 타입의 단언
  5. 실제 타입을 설계하는 법. 
*/

// type Model = {
//   id: number;
//   name: string;
//   isActive: boolean;
// };

// type Model = {
//   id: number;
//   name: string;
//   isActive: boolean;
//   age: number;
//   serial: string;
// };

// type PickOnlyStrings<T> = {
//   [K in keyof T as T[K] extends string ? K : never]: T[K];
// };

// type PickOnlyStrings<T> = {
//   [K in keyof T as T[K] extends string ? K : never]: T[K];
// };
// type Result = PickOnlyStrings<Model>;

// printer.printType("Result");

// type FunctionParams<T> = T extends (...args: infer R) => any ? R : never;
// type MyFunction = (name: string, age: number) => void;
// type Params = FunctionParams<MyFunction>;
// const args: Params = ["Alice", 30];

// printer.printType("Params");
// type EventHandler<T> = {
//   [K in keyof T as `on${Capitalize<string & K>}`]: (payload: T[K]) => void;
// };

// type Events = {
//   click: string;
//   focus: boolean;
// };
// type myEventType = EventHandler<Events>;

// printer.printType("myEventType");

// type BooleanArray = {
//   [index: number]: boolean;
// };

// const flags: BooleanArray = [true, false, true];

// printer.printType("flags");

// type Lang = "KO" | "EN" | "JP";
// type LangFileName = `message.${Lang}.json`;

// printer.printType("LangFileName");

// type Payload = {
//   click: { x: number; y: number };
//   scroll: { top: number };
//   drag: { dx: number; dy: number };
// };

// type EventHandlerMap = {
//   [K in keyof Payload as `on{Capitalize<string as K>}`]: (
//     payload: Payload[K]
//   ) => void;
// };

// printer.printType("EventHandlerMap");

// const handler: EventHandlerMap = {
//   onClick: (payload) => {
//     console.log(`Click at (${payload.x}), ${payload.y})`);
//   },
// };
// type Payload2 = {
//   click: { x: number; y: number };
//   scroll: { top: number };
// };

// type Payload = {
//   click: { x: number; y: number };
//   scroll: { top: number };
//   drag: { dx: number; dy: number };
// };

// type EventHandlerMap = {
//   [K in keyof Payload as `on${Capitalize<string & K>}`]: (
//     payload: Payload[K]
//   ) => void;
// };
// type EventHanderMap2 = {
//   [K in keyof Payload as `on${Capitalize<string & K>}`]: (
//     payload: Payload[K]
//   ) => void;
// };

// const handler: EventHandlerMap = {
//   onClick: (payload) => {
//     console.log(`Click at (${payload.x}, ${payload.y})`);
//   },
//   onScroll: (payload) => {
//     console.log(`Scrolled to top: ${payload.top}`);
//   },
//   onDrag: (payload) => {
//     console.log(`Dragged by (${payload.dx}, ${payload.dy})`);
//   },
// };

// const Handl: EventHandlerMap = {
//   onClick: (payload) => {
//     console.log(`Click at (${payload}, ${payload.y})`);
//   },
//   // onScroll: (payload) => {
//   //   console.log(`Scrolled to Top ${payload.top}`);
//   // },
// };
// import { TypeAliasPrinter } from "./newprinterfromgrok";
// const printer = new TypeAliasPrinter("src/index.ts");
// type OnlyStringKeys<T> = {
//   [K in keyof T]: T[K] extends string ? K : never;
// }[keyof T];

// type MyT = OnlyStringKeys<Payload>;
// printer.printType("MyT");

// type Required<T> = {
//   [P in keyof T]-?: T[P];
// };

type User = {
  name?: string;
  age?: number;
  email?: string;
};

function vailidateUser(user: Required<User>) {
  console.log(user.name.toUpperCase());
  console.log(user.age.toFixed(0));
}

// type SetRequired<T, K extends keyof T> = T & {
//   [P in K]-?: T[P];
// };
// type SetRequired<T, K extends keyof T> = T & {
//   [P in K]-?: T[P];
// };
// type RequiredEmailUser = SetRequired<User, "email">;

// printer.printType("RequiredEmailUser", { expended: true });

// function vailidateEmailUser(user: SetRequired<User, "email">) {
//   // console.log(user.name.toUpperCase());
//   // console.log(user.age.toFixed(0));
//   if (typeof user.name != undefined) {
//     console.log(user.name);
//   }
//   console.log(user.email);
// }

// function updateUser(id: number, updates: Partial<User>) {
//   console.log(`User ID : ${id}`);
//   if (updates.name) {
//     console.log(`Updating name to: ${updates.name}`);
//   }
//   if (updates.email) {
//     console.log(`Updating email to : ${updates.email}`);
//   }
// }

// const partialUpdate1: Partial<User> = {
//   name: "jaue",
// };

// const partialUpdate2: Partial<User> = {
//   email: "Jaeu@naver.com",
// };

// updateUser(1, partialUpdate1);

// updateUser(2, partialUpdate2);

// type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// type Exclude<T, U> = T extends U ? never : T;
// type A = "a" | "b" | "c";
// type B = "a" | "c";

// type C = Exclude<A, B>;

// printer.printType("C");

// interface MyUser {
//   id: number;
//   name: string;
//   email: string;
//   isAdmin: boolean;
// }

// type PublicUser = Pick<MyUser, "id" | "name">;

// const user1: MyUser = {
//   id: 1,
//   name: "Alice",
//   email: "alice@example.com",
//   isAdmin: false,
// };

// const user2: MyUser = {
//   id: 2,
//   name: "Bob",
//   email: "bob@example.com",
//   isAdmin: true,
// };

// const user3: MyUser = {
//   id: 3,
//   name: "Charlie",
//   email: "charlie@example.com",
//   isAdmin: false,
// };

// const users: MyUser[] = [
//   { id: 1, name: "Alice", email: "alice@example.com", isAdmin: false },
//   { id: 2, name: "Bob", email: "bob@example.com", isAdmin: true },
//   { id: 3, name: "Charlie", email: "charlie@example.com", isAdmin: false },
//   { id: 4, name: "Dana", email: "dana@example.com", isAdmin: true },
// ];
// function GetAdmins(users: MyUser[]): PublicAdminUser[] {
//   return users
//     .filter((u) => u.isAdmin)
//     .map(({ id, name }) => ({
//       id,
//       name,
//     }));
// }
// // import { TypeAliasPrinter } from "./improved_type_printer";

// // const printer2 = new TypeAliasPrinter("src/index.ts");
// import { TypeAliasPrinter } from "./improved_type_printer";
// const printer3 = new TypeAliasPrinter("src/index.ts");
// interface MyUser {
//   id: number;
//   name: string;
//   email: string;
//   isAdmin: boolean;
// }
// type PublicAdminUser = Pick<MyUser, "id" | "name">;
// // printer3.printType("PublicAdminUser");

// // printer3.printType("ExtractedUser");

// type Role = "admin" | "user" | "guest";
// type NonAdminRole = Exclude<Role, "admin">;
// printer3.printType("NonAdminRole");
// console.log(GetAdmins(users));
// const adminUsers: PublicAdminUser[] = GetAdmins(users);
// 우리는 UserPrivate이라는 전체 정보를 가진 내부 객체에서,
// 타입스크립트의 Pick 유틸리티를 통해 민감 정보를 타입 수준에서 분리하였고,
// 관리자(isAdmin: true)만 필터링한 뒤, id와 name만 노출되도록 안전하게 설계했습니다.
// 이로써 컴파일 단계에서 민감 정보가 외부로 나가는 것을 차단하는 타입 기반 보안 계층을 구축했다고 볼 수 있습니다. ✅

// printer3.printType("PublicAdminUser");

// interface KUser {
//   id: number;
//   name: string;
//   email: string;
//   isAdmin: boolean;
// }

// type PublicUser = Pick<KUser, "id" | "name">;

import { TypeAliasPrinter } from "./Printer";
const printer = new TypeAliasPrinter("src/index.ts");
interface MyUser {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

type PublicAdminUser = Pick<MyUser, "id" | "name">;
const users: MyUser[] = [
  { id: 1, name: "Alice", email: "alice@example.com", isAdmin: false },
  { id: 2, name: "Bob", email: "bob@example.com", isAdmin: true },
  { id: 3, name: "Charlie", email: "charlie@example.com", isAdmin: false },
  { id: 4, name: "Dana", email: "dana@example.com", isAdmin: true },
];
function GetAdmins(users: MyUser[]): PublicAdminUser[] {
  return users
    .filter((u) => u.isAdmin)
    .map(({ id, name }) => ({
      id,
      name,
    }));
}

// console.log(GetAdmins(users));
const adminUsers: PublicAdminUser[] = GetAdmins(users);

// printer.printType("PublicAdminUser");
// interface Doja {
//   name: string;
// }
// const app: Doja = { name: "Jaue" };
// printer.printType("app");

// const qwe = () => console.log("hi");

// printer.printType("qwe");
// const val = GetAdmins(users);
// printer.printType("val");
// type someType = string | number;
// type someType2 = {
//   name: string;
//   age: number;
// };

// type someType3 = someType & someType2;
// printer.printType("someType3", { verbose: true, final: true });
// printer.printType("someType");
// printer.printType("someType2");
// printer.printType("PublicAdminUser");
// interface someInter {
//   name: string;
// }
// printer.printType("someInter");

// printer.printType("someType3", { verbose: true });

// type curr = string & someType2;
// printer.printType("curr");

// type A = string;
// type B = { name: string; age: number };

// type C = A & B;

// printer.printType("C", { verbose: true, final: true });

function createLookup<K extends string, V>(entries: [K, V][]): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

const colors = createLookup([["primary", "#fff0000"]]);
