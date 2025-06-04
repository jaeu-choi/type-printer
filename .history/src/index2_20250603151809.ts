import { TypeAliasPrinter } from "./Printer/printer";
const printer = new TypeAliasPrinter("src/index2.ts");

// // ===== 테스트용 타입 정의들 =====

// // 1. 기본 Union 타입
// type SimpleUnion = string | number;

// // 2. 복잡한 Union 타입
// type ComplexUnion = string | { name: string; age: number } | number[];

// // 3. Intersection 타입
// type UserBase = { id: number; name: string };
// type UserMeta = { createdAt: Date; updatedAt: Date };
// type FullUser = UserBase & UserMeta;

// // 4. 인터페이스들
// interface Client {
//   email: string;
//   isActive: boolean;
// }

// interface Admin {
//   permissions: string[];
//   level: "super" | "normal";
// }

// interface User {
//   name: string;
//   age: number | Client;
//   role: "user" | "admin";
//   details: {
//     address: string;
//     phone?: string;
//   };
// }

// // 5. IndexAccess 타입들 (참조 보존 테스트용)
// type UserAge = User["age"]; // number | Client
// type UserRole = User["role"]; // "user" | "admin"
// type UserDetails = User["details"]; // { address: string; phone?: string }
// type ClientEmail = Client["email"]; // string

// // 6. 조건부 타입들
// type IsString<T> = T extends string ? true : false;
// type StringOrNumber<T> = T extends string ? string : number;
// type NonNullable<T> = T extends null | undefined ? never : T;

// // 7. 조건부 타입 인스턴스들
// type TestString = IsString<"hello">; // true
// type TestNumber = IsString<42>; // false
// type TestStringOrNumber = StringOrNumber<"hi">; // string
// type TestNonNull = NonNullable<string | null>; // string

// // 8. 유틸리티 타입들
// type PartialUser = Partial<User>;
// type PickedUser = Pick<User, "name" | "age">;
// type OmittedUser = Omit<User, "role">;
// type RequiredClient = Required<Client>;

// // 9. 배열 타입들
// type StringArray = string[];
// type UserArray = User[];
// type ComplexArray = Array<{ id: number; data: string | number }>;

// // 10. 복잡한 중첩 타입
// type DeepNested = {
//   users: User[];
//   meta: {
//     total: number;
//     filters: {
//       active: boolean;
//       roles: ("user" | "admin")[];
//     };
//   };
//   transform<T>(data: T): T extends string ? string[] : number[];
// };

// // 11. 제네릭 타입들
// type Container<T> = {
//   value: T;
//   metadata: {
//     type: string;
//     created: Date;
//   };
// };

// type ApiResponse<T, E = Error> = {
//   data?: T;
//   error?: E;
//   status: number;
// };

// // 12. 고급 조건부 타입
// type ExtractArrayType<T> = T extends (infer U)[] ? U : never;
// type KeysOfType<T, U> = {
//   [K in keyof T]: T[K] extends U ? K : never;
// }[keyof T];

// ===== 테스트 실행 코드 =====

// TypeAliasPrinter 인스턴스 생성 (이 파일 경로로)
// const printer = new TypeAliasPrinter(__filename);

// 기본 테스트들
// console.log("=== 1. 기본 Union 타입 ===");
// printer.printType("SimpleUnion");
// printer.printType("SimpleUnion", { expanded: true });

// console.log("\n=== 2. 복잡한 Union 타입 ===");
// // printer.printType("ComplexUnion");
// // printer.printType("ComplexUnion", { expanded: true });

// console.log("\n=== 3. Intersection 타입 ===");
// // printer.printType("FullUser");
// // printer.printType("FullUser", { expanded: true });

// console.log("\n=== 4. IndexAccess 타입 (참조 보존 테스트) ===");
// // printer.printType("UserAge");           // number | Client → [Client] 표시되어야 함
// // printer.printType("UserAge", { expanded: true });

// console.log("\n=== 5. 조건부 타입 ===");
// // printer.printType("TestString");        // true
// // printer.printType("TestString", { expanded: true });

// console.log("\n=== 6. 유틸리티 타입 ===");
// // printer.printType("PartialUser");       // 모든 프로퍼티가 optional
// // printer.printType("PickedUser");        // name, age만
// // printer.printType("PickedUser", { expanded: true });

// console.log("\n=== 7. 배열 타입 ===");
// // printer.printType("UserArray");
// // printer.printType("ComplexArray", { expanded: true });

// console.log("\n=== 8. 인터페이스 ===");
// // printer.printType("User");
// // printer.printType("User", { expanded: true });

// console.log("\n=== 9. 제네릭 인스턴스 ===");
// // printer.printType("Container<string>");
// // printer.printType("ApiResponse<User, string>");

// console.log("\n=== 10. 고급 조건부 타입 ===");
// // printer.printType("ExtractArrayType<string[]>");  // string
// // printer.printType("KeysOfType<User, string>");    // "name"

// ===== 실제 사용 예시 =====
/*
import { TypeAliasPrinter } from './src/printer';

const printer = new TypeAliasPrinter('./test-types.ts');

// 간단한 테스트
printer.printType("SimpleUnion");

// 참조 보존 테스트 (가장 중요!)
printer.printType("UserAge");  // Client가 [Client]로 표시되는지 확인

// 복잡한 타입 분석
printer.printType("FullUser", { expanded: true });

// 조건부 타입 평가 과정
printer.printType("TestString", { expanded: true });
*/

// type foo = {
//   name: string;
//   age: number;
//   email: {
//     company: string;
//     personal: string | number;
//   };
// };

// type foo2 = {
//   name: string;
// };

// type foo3 = foo & foo2;

type foo = string;
type foo2 = {
  name: number;
  age: string;
  foos: A;
};
type foo4 = number & foo;
type bar5 = {
  value: string;
  api: true;
};
type foo3 = foo & foo2;
type A = { a: string; boo: bar5 };
type B = { b: number };
type C = A & B; // { a: string; b: number }

type bar = {
  name: string;
};

type bar2 = {
  age: number;
  email: foo2 | foo;
};

type bar2sKey = keyof bar2;

// printer.printType("bar2sKey");

type some = {
  name: string;
  age: number;
  address: { city: string; zipNum: number };
  email: "age" | "number";
};

type someValue = some["email" | "age" | "address"];
printer.printType("someValue", { expanded: true });
// |---{
//   |---age: number;
//   |---email: {
//              |---name: number;
//              };
// |---}

// type Response = {
//   data: {
//     user: {
//       name: string;
//       roles: ("admin" | "user")[];
//     };
//   };
//   status: number;
// };

// type RolesArray = Response["data"]["user"]["roles"];

// printer.printType("RolesArray");

// type keys = keyof some;
// printer.printType("keys", { expanded: true });
