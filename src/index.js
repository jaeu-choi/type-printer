"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
// const printer = new TypeAliasPrinter("./index.ts");
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
// // type User = {
// //   id: number;
// //   name: string;
// // };
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
function identity(value) {
    return value;
}
console.log(identity(123));
console.log(identity("HELLLO"));
function stringfy(value) {
    return JSON.stringify(value);
}
console.log(stringfy({ name: "John", age: 30 }));
