import { TypeAliasPrinter } from "./Printer/printer";
// const printer = new TypeAliasPrinter("src/index2.ts");

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

// type some = {
//   name: string;
//   age: number;
//   address: { city: string; zipNum: number };
//   email: "age" | "number";
// };
//
// type NewType = {
//   [K in keyof some]: some[K];
// };
//
// printer.printType("NewType", { expanded: true });
//
// type User = {
//   name: string;
//   age: number;
//   isAdmin: boolean;
// };
//
// type PartialUser = {
//   [K in keyof User]?: User[K];
// };
//
// printer.printType("PartialUser", { expanded: true });
//
// type ServerEvents = {
//   login: { userId: string; token: string };
//   logout: { userId: string };
//   error: { code: number; message: string };
// };
//
// type EventHandlers = {
//   [K in keyof ServerEvents]: (payload: ServerEvents[K]) => void;
// };
//
// printer.printType("EventHandlers", { expanded: true });
//
// const handler: EventHandlers = {
//   login: ({ userId, token }) => {
//     console.log(`Loggin in :${userId}`);
//   },
//
//   logout: ({ userId }) => {
//     console.log(`Logged out: ${userId}`);
//   },
//
//   error: ({ code, message }) => {
//     console.error(`Error ${code}: ${message}`);
//   },
// };
//
// printer.printType("handler", { expanded: true });
// type some2 = () => void;

// printer.printType("some2");

// type NewType = {
//   [K in keyof some & keyof bar2]: bar2[K];
// };
// printer.printType("NewType");
// type someKey = keyof some;
// printer.printType("someKey", { expanded: true });

// type someVal = some["age" | "email"];
// printer.printType("someVal", { expanded: true });

// type someValue = some["email" | "age" | "address"];
// printer.printType("someValue", { expanded: true });
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
//
// type RolesArray = Response["data"]["user"]["roles"];
//
// printer.printType("RolesArray", { expanded: true });

// type keys = keyof some;
// printer.printType("keys", { expanded: true });
//
// type FormShape = {
//   username: string;
//   age: number;
//   isAdmin: boolean;
// };
//
// type ValidationRules = {
//   [K in keyof FormShape]: {
//     required: boolean;
//     validator?: (value: FormShape[K]) => boolean;
//     label?: string;
//   };
// };
//
// printer.printType("ValidationRules", { expanded: true });
// printer.printType("ValidationRules");

// type ServerEvents = {
//   login: { userId: string; token: string };
//   logout: { userId: string };
//   error: { code: number; message: string };
// };
//
// // 각 이벤트에 대해 알맞은 handler 함수 타입을 만드는 Mapped Type
// type EventHandlers = {
//   [K in keyof ServerEvents]: (payload: ServerEvents[K]) => void;
// };
//
// printer.printType("EventHandlers", { expanded: true });
// type Source = {
//   id: number;
//   name: string;
//   isAdmin: boolean;
// };
//
// type Schema = {
//   id: "hidden";
//   name: "text";
//   isAdmin: "checkbox";
// };
//
// type MapFields<S extends object, C extends Record<keyof S, String>> = {
//   [K in keyof S]: {
//     fieldName: K;
//     component: C[K];
//     value: S[K];
//   };
// };
//
// printer.printType("MapFields", { expanded: true });
//
// type From = {
//   id: number;
//   name: string;
//   email: string;
// };

// type To = {
//   ID: "id";
//   NAME: "name";
//   EMAIL: "email";
// };

// type TranslateKeys<F extends object, T extends Record<string, keyof F>> = {
//   [K in keyof T]: F[T[K]];
// };

// printer.printType("TranslateKeys", { expanded: true });
// type Translated = TranslateKeys<From, To>;
// printer.printType("Translated", { expanded: true, mapped: "TranslateKeys" });

// printer.printType("Translated", {
//   expanded: true,
//   mappedAnalysis: {
//     enabled: true,
//     pattern: "TranslateKeys",
//     typeArgs: ["From", "To"],
//   },
// });

// printer.printType("Translated", {
//   expanded: true,
//   mappedAnalysis: {
//     enabled: true,
//     pattern: "TranslateKeys",
//     typeArgs: ["From", "To"],
//   },
// });

// type From = {
//   id: number;
//   name: string;
//   email: string;
// };

// type Map = {
//   userId: "id";
//   displayName: "name";
// };

// // // From에서 Map의 value에 해당하는 필드만 골라, Map의 key 이름으로 바꿔서 구성
// type RemapKeys<F extends object, M extends Record<string, keyof F>> = {
//   [K in keyof M]: F[M[K]];
// };
// type Remapped = RemapKeys<From, Map>;

// printer.printType("Remapped", {
// expanded: true,
// mappedAnalysis: {
//   enabled: true,
//   pattern: "RemapKeys",
//   typeArgs: ["From", "Map"],
// },
// });

// type Flatten<T> = {
//   [K in keyof T]: T[K] extends object
//     ? { //         [K2 in keyof T[K] as `${Extract<K, string>}.${Extract<
//           K2,
//           string
//         >}`]: T[K][K2];
//       }
//     : { [P in Extract<K, string>]: T[K] };
// }[keyof T];

// type Nested = {
//   user: {
//     id: number;
//     name: string;
//   };
//   active: boolean;
// };
// type flat = Flatten<Nested>;

// printer.printType("flat", { expanded: true });

// type Simple<T> = { [K in keyof T]: T[K] };
// type User = { name: string; age: number };
// type SimpleUser = Simple<User>;

// printer.printType("SimpleUser", { expanded: true });

// type myPrimitiveType = "limid";

// printer.printType("myPrimitiveType", { expanded: true });

// type MyStringLiteral = "hello";

// printer.printType("MyStringLiteral");
// type SimpleString = "hello"; // TemplateTypeHandler → LiteralTypeHandler
// type SimpleNumber = 42; // TemplateTypeHandler → LiteralTypeHandler
// type Template<T> = `hello ${T}`; // TemplateTypeHandler 자체 처리
// type Complex = `${string}-${number}`; // TemplateTypeHandler 자체 처리

// printer.printType("SimpleString", { expanded: true });
// printer.printType("Template", { expanded: true });
// type Props = {
//   id: number;
//   name: string;
//   isActive: boolean;
// };

// 각 키에 대해 "onChange:id", "onChange:name", ... 같은 타입 만들기
// type ChangeEventNames = `onChange:${keyof Props}`;
// type IsString<T> = T extends string ? "yes" : "no";

// type D = IsString<string>; // "yes"
// type F = IsString<number>; // "no

// printer.printType("D");
// printer.printType("F", { expanded: true });

// 1. 기본 조건부 제네릭 타입
type IsString<T> = T extends string ? "yes" : "no";
type IsNumber<T> = T extends number ? "true" : "false";

// 2. 제네릭 인스턴스들 (우리가 테스트할 타입들)
type D = IsString<string>; // "yes"
type F = IsString<number>; // "no"
type G = IsNumber<42>; // "true"
type H = IsNumber<string>; // "false"

// 3. 배열 제네릭
type MyArray<T> = T[];
type StringArray = MyArray<string>; // string[]
type NumberArray = MyArray<number>; // number[]

// 4. 객체 제네릭
type KeyValue<K, V> = {
  key: K;
  value: V;
};
type UserData = KeyValue<string, number>; // { key: string; value: number }
type Settings = KeyValue<string, boolean>; // { key: string; value: boolean }

// 5. 더 복잡한 조건부 타입
type NonNullable<T> = T extends null | undefined ? never : T;
type CleanString = NonNullable<string>; // string
type CleanStringOrNull = NonNullable<string | null>; // string

// 6. 중첩 제네릭
type Flatten<T> = T extends (infer U)[] ? U : T;
type FlattenedNumbers = Flatten<number[]>; // number
type FlattenedString = Flatten<string>; // string

// function runGenericTests() {
//   console.log("🧪 제네릭 처리 시스템 테스트 시작");
//   console.log("=".repeat(60));

//   const printer = new TypeAliasPrinter("src/index2.ts", { debugMode: true });

//   // 기본 조건부 제네릭 테스트
//   console.log("\n🔍 기본 조건부 제네릭 테스트");
//   console.log("-".repeat(40));

//   try {
//     console.log("\n📋 D = IsString<string> 테스트:");
//     printer.printType("D", { expanded: true });

//     console.log("\n📋 F = IsString<number> 테스트:");
//     printer.printType("F", { expanded: true });
//   } catch (error) {
//     console.error("❌ 기본 제네릭 테스트 실패:", error);
//   }

//   // 배열 제네릭 테스트
//   console.log("\n🔍 배열 제네릭 테스트");
//   console.log("-".repeat(40));

//   try {
//     console.log("\n📋 StringArray = MyArray<string> 테스트:");
//     printer.printType("StringArray", { expanded: true });

//     console.log("\n📋 NumberArray = MyArray<number> 테스트:");
//     printer.printType("NumberArray", { expanded: true });
//   } catch (error) {
//     console.error("❌ 배열 제네릭 테스트 실패:", error);
//   }

//   // 객체 제네릭 테스트
//   console.log("\n🔍 객체 제네릭 테스트");
//   console.log("-".repeat(40));

//   try {
//     console.log("\n📋 UserData = KeyValue<string, number> 테스트:");
//     printer.printType("UserData", { expanded: true });
//   } catch (error) {
//     console.error("❌ 객체 제네릭 테스트 실패:", error);
//   }

//   // 제네릭 처리 통계 출력
//   console.log("\n📊 제네릭 처리 시스템 상태");
//   console.log("-".repeat(40));

//   try {
//     const status = printer.getSystemStatus();
//     console.log(`핸들러 개수: ${status.handlerCount}`);
//     console.log("등록된 핸들러들:");
//     status.handlers.forEach((h) => {
//       console.log(`  - ${h.name} (우선순위: ${h.priority})`);
//     });
//   } catch (error) {
//     console.error("❌ 시스템 상태 확인 실패:", error);
//   }

//   console.log("\n🎉 제네릭 테스트 완료!");
// }

// 실행
// runGenericTests();
// const printer = new TypeAliasPrinter("src/index2.ts");
// type mytype = string;
// 기본 조건부 타입
const printer = new TypeAliasPrinter("src/index2.ts");
type IsString2<T> = T extends string ? "yes" : "no";

// infer가 포함된 타입
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 배열 요소 추출
type ArrayElement<T> = T extends (infer U)[] ? U : never;

// 중첩 조건부 타입
type DeepCheck<T> = T extends string
  ? T extends "hello"
    ? "greeting"
    : "other string"
  : "not string";

type parma = "hello";
type MyIsString = IsString<parma>;

printer.printType("MyIsString");
